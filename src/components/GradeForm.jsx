// src/components/GradeForm.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Form, InputNumber, Switch, Button, Card, Space, Typography, Divider, Spin, Alert, Row, Col, Tag, App, Input } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const GradeForm = ({ 
  assignmentConfig,
  initialEvaluation,
  onPreview,
  onSubmit,
  loading = false 
}) => {
  const { message: messageApi } = App.useApp();

  // Состояния для весовых критериев
  const [weightedScores, setWeightedScores] = useState({});
  
  // Состояния для бонусов/штрафов (отправляются в toggledValues)
  const [toggledBonuses, setToggledBonuses] = useState({});
  
  // Состояния для коэффициентов качества (НЕ отправляются в toggledValues, бэкенд применяет их автоматически)
  const [toggledQuality, setToggledQuality] = useState({});

  // Состояния для блокирующих модификаторов (отправляются в toggledValues)
  const [toggledBlocking, setToggledBlocking] = useState({});
  
  // Итоговый результат
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [score, setScore] = useState(null);
  const [status, setStatus] = useState('checked');
  const [comment, setComment] = useState('');
  
  // Флаги для предотвращения бесконечного цикла
  const isPreviewing = useRef(false);
  const prevEvaluationRef = useRef(null);
  const isInitialized = useRef(false);

  // Инициализация начальных значений
  useEffect(() => {
    if (!assignmentConfig) return;

    const scores = {};
    assignmentConfig.weightedCriteria?.forEach(criterion => {
      scores[criterion.id] = 0;
    });
    initialEvaluation?.weightedValues?.forEach(wv => {
      scores[wv.criterionId] = wv.score ?? 0;
    });

    const toggledById = {};
    initialEvaluation?.toggledValues?.forEach(tv => {
      toggledById[tv.criterionId] = tv.enabled;
    });

    // Инициализация бонусов/штрафов
    const bonuses = {};
    assignmentConfig.bonusPenalties?.forEach(criterion => {
      bonuses[criterion.id] = toggledById[criterion.id] ?? false;
    });

    // Инициализация коэффициентов качества
    const quality = {};
    assignmentConfig.qualityCoefficients?.forEach(criterion => {
      quality[criterion.id] = toggledById[criterion.id] ?? false;
    });

    // Инициализация блокирующих модификаторов
    const blocking = {};
    assignmentConfig.blockingModifiers?.forEach(criterion => {
      blocking[criterion.id] = toggledById[criterion.id] ?? false;
    });

    setWeightedScores(scores);
    setToggledBonuses(bonuses);
    setToggledQuality(quality);
    setToggledBlocking(blocking);
    setPreview(null);
    setScore(null);
    prevEvaluationRef.current = null;
    isInitialized.current = true;
  }, [assignmentConfig, initialEvaluation]);

  /**
   * Сборка объекта Evaluation для отправки
   * 
   * ВАЖНО: Бэкенд ожидает в toggledValues ТОЛЬКО критерии типов:
   * - bonusPenalty (бонусы/штрафы)
   * - blocking (блокирующие модификаторы)
   * 
   * Коэффициенты качества (quality) НЕ отправляются в toggledValues,
   * они применяются бэкендом автоматически на основе порогов.
   */
  const buildEvaluation = useCallback(() => {
    const weightedValues = [];
    const toggledValues = [];

    // 1. Весовые критерии
    if (assignmentConfig?.weightedCriteria) {
      assignmentConfig.weightedCriteria.forEach(criterion => {
        weightedValues.push({
          criterionId: criterion.id,
          score: Number(weightedScores[criterion.id] ?? 0)
        });
      });
    }

    // 2. Бонусы и штрафы (отправляются в toggledValues)
    if (assignmentConfig?.bonusPenalties) {
      assignmentConfig.bonusPenalties.forEach(bp => {
        toggledValues.push({
          criterionId: bp.id,
          enabled: toggledBonuses[bp.id] || false
        });
      });
    }

    // 3. Коэффициенты качества - НЕ отправляем в toggledValues!
    // Они будут применены бэкендом автоматически на основе порогов.
    // Если нужно их учитывать для preview - бэкенд сделает это сам,
    // но только если они включены в конфигурации задания.

    // 4. Блокирующие модификаторы (отправляются в toggledValues)
    if (assignmentConfig?.blockingModifiers) {
      assignmentConfig.blockingModifiers.forEach(blocking => {
        toggledValues.push({
          criterionId: blocking.id,
          enabled: toggledBlocking[blocking.id] || false
        });
      });
    }

    return { weightedValues, toggledValues };
  }, [assignmentConfig, weightedScores, toggledBonuses, toggledBlocking]);

  // Запрос предпросмотра оценки
  const handlePreview = useCallback(async (evaluation) => {
    if (!onPreview) return;
    if (isPreviewing.current) return;
    
    isPreviewing.current = true;
    setPreviewLoading(true);
    try {
      const result = await onPreview(evaluation);
      setPreview(result);
      if (result?.finalScore !== undefined) {
        setScore(result.finalScore);
      } else {
        setScore(null);
      }
    } catch (error) {
      console.error('Preview error:', error);
      messageApi.error(error.response?.data?.message || 'Ошибка при расчёте предпросмотра');
    } finally {
      setPreviewLoading(false);
      setTimeout(() => {
        isPreviewing.current = false;
      }, 200);
    }
  }, [onPreview, messageApi]);

  // При изменении параметров - пересчитываем предпросмотр (с защитой от циклов)
  useEffect(() => {
    if (!isInitialized.current) return;
    
    const evaluation = buildEvaluation();
    if ((evaluation.weightedValues?.length || 0) === 0 && (evaluation.toggledValues?.length || 0) === 0) return;
    const evaluationStr = JSON.stringify(evaluation);
    
    // Проверяем, изменилась ли оценка
    if (prevEvaluationRef.current !== evaluationStr) {
      prevEvaluationRef.current = evaluationStr;
      
      // Небольшая задержка для предотвращения множественных вызовов
      const timeoutId = setTimeout(() => {
        handlePreview(evaluation);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [weightedScores, toggledBonuses, toggledBlocking, buildEvaluation, handlePreview]);

  // Отправка оценки
  const handleSubmit = async () => {
    const evaluation = buildEvaluation();
    
    if ((score === null || score === undefined) && preview?.finalScore === undefined) {
      messageApi.error('Пожалуйста, дождитесь расчёта оценки');
      return;
    }

    const finalScore = score !== null ? score : preview?.finalScore;
    await onSubmit(evaluation, finalScore, status, comment);
  };

  // Обновление весового критерия
  const updateWeightedScore = (criterionId, value) => {
    setWeightedScores(prev => ({
      ...prev,
      [criterionId]: value
    }));
  };

  // Обновление бонуса/штрафа
  const updateBonus = (criterionId, enabled) => {
    setToggledBonuses(prev => ({ ...prev, [criterionId]: enabled }));
  };

  // Обновление коэффициента качества (только локально, не отправляется на бэкенд)
  const updateQuality = (criterionId, enabled) => {
    setToggledQuality(prev => ({ ...prev, [criterionId]: enabled }));
  };

  // Обновление блокирующего модификатора
  const updateBlocking = (criterionId, enabled) => {
    setToggledBlocking(prev => ({ ...prev, [criterionId]: enabled }));
  };

  if (!assignmentConfig) {
    return <Alert title="Конфигурация задания не найдена" type="warning" />;
  }

  const { weightedCriteria, bonusPenalties, qualityCoefficients, blockingModifiers } = assignmentConfig;
  const maxPossibleScore = weightedCriteria?.reduce((sum, c) => sum + (c.maxScore || c.maxPoints) * (c.weight || 1), 0) || 0;

  return (
    <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '0 8px' }}>
      {/* Весовые критерии */}
      {weightedCriteria && weightedCriteria.length > 0 && (
        <>
          <Title level={5}>Весовые критерии</Title>
          {weightedCriteria.map(criterion => {
            const maxScore = criterion.maxScore || criterion.maxPoints || 5;
            const weight = criterion.weight || 1;
            return (
              <Card key={criterion.id} size="small" style={{ marginBottom: 8 }}>
                <Row align="middle" gutter={16}>
                  <Col flex="auto">
                    <Text strong>{criterion.title}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      вес ×{weight} · макс. {maxScore} баллов
                    </Text>
                  </Col>
                  <Col>
                    <InputNumber
                      min={0}
                      max={maxScore}
                      step={0.5}
                      value={weightedScores[criterion.id] ?? 0}
                      onChange={(val) => updateWeightedScore(criterion.id, val)}
                      style={{ width: 100 }}
                    />
                    <Text style={{ marginLeft: 8 }}>/ {maxScore}</Text>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </>
      )}

      {/* Бонусы и штрафы */}
      {bonusPenalties && bonusPenalties.length > 0 && (
        <>
          <Divider />
          <Title level={5}>Бонусы и штрафы</Title>
          {bonusPenalties.map(bp => {
            const score = bp.score || bp.maxAllowedScore || 1;
            const direction = bp.direction?.toLowerCase() === 'subtract' ? 'subtract' : 'add';
            return (
              <Card key={bp.id} size="small" style={{ marginBottom: 8 }}>
                <Row align="middle" gutter={16}>
                  <Col flex="auto">
                    <Text strong>{bp.title}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {direction === 'add' ? `➕ +${score} баллов` : `➖ -${Math.abs(score)} баллов`}
                    </Text>
                  </Col>
                  <Col>
                    <Switch
                      checked={toggledBonuses[bp.id] || false}
                      onChange={(checked) => updateBonus(bp.id, checked)}
                      checkedChildren={<CheckOutlined />}
                      unCheckedChildren={<CloseOutlined />}
                    />
                  </Col>
                </Row>
              </Card>
            );
          })}
        </>
      )}

      {/* Коэффициенты качества (автоматические) - только для отображения, не отправляются */}
      {qualityCoefficients && qualityCoefficients.length > 0 && (
        <>
          <Divider />
          <Title level={5}>Коэффициенты качества (автоматические)</Title>
          <Alert
            message="Информация"
            description="Эти коэффициенты применяются автоматически на основе пороговых значений. Они не требуют ручного включения."
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />
          {qualityCoefficients.map(qc => {
            const score = qc.score || 0;
            const threshold = qc.threshold || 0;
            const direction = qc.direction?.toLowerCase() === 'subtract' ? 'subtract' : 'add';
            return (
              <Card key={qc.id} size="small" style={{ marginBottom: 8, background: '#fafafa' }}>
                <Row align="middle" gutter={16}>
                  <Col flex="auto">
                    <Text strong>{qc.title}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {direction === 'add' 
                        ? `Бонус +${score} при &gt;${threshold * 100}%` 
                        : `Штраф -${Math.abs(score)} при &lt;${threshold * 100}%`}
                    </Text>
                  </Col>
                  <Col>
                    <Tag color="blue">Автоматический</Tag>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </>
      )}

      {/* Блокирующие модификаторы */}
      {blockingModifiers && blockingModifiers.length > 0 && (
        <>
          <Divider />
          <Title level={5}>Ограничивающие критерии</Title>
          {blockingModifiers.map(blocking => {
            const maxScore = blocking.maxAllowedScore || 5;
            return (
              <Card key={blocking.id} size="small" style={{ marginBottom: 8 }}>
                <Row align="middle" gutter={16}>
                  <Col flex="auto">
                    <Text strong>{blocking.title}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      максимум {maxScore} баллов при включении
                    </Text>
                  </Col>
                  <Col>
                    <Switch
                      checked={toggledBlocking[blocking.id] || false}
                      onChange={(checked) => updateBlocking(blocking.id, checked)}
                      checkedChildren={<CheckOutlined />}
                      unCheckedChildren={<CloseOutlined />}
                    />
                  </Col>
                </Row>
              </Card>
            );
          })}
        </>
      )}

      {/* Предпросмотр оценки */}
      <Divider />
      <Card style={{ background: '#f0f7ff' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Text strong style={{ fontSize: 16 }}>Итоговая оценка</Text>
            {previewLoading ? (
              <Spin size="small" style={{ marginLeft: 12 }} />
            ) : (
              <Text style={{ fontSize: 24, fontWeight: 'bold', marginLeft: 12, color: '#1890ff' }}>
                {preview?.finalScore?.toFixed(1) || '—'} / {maxPossibleScore?.toFixed(1)}
              </Text>
            )}
          </Col>
          <Col>
            <Tag color={preview?.thresholdApplied ? 'orange' : 'green'}>
              {preview?.thresholdApplied ? preview.thresholdReason || 'Порог применён' : 'OK'}
            </Tag>
          </Col>
        </Row>
        
        {preview && (
          <div style={{ marginTop: 12 }}>
            <Row gutter={[8, 8]}>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>Базовая оценка:</Text>
                <div><strong>{preview.baseScore?.toFixed(1)}</strong></div>
              </Col>
              {(preview.latePenalty || 0) > 0 && (
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Штраф за просрочку:</Text>
                  <div><strong style={{ color: '#ff4d4f' }}>-{preview.latePenalty?.toFixed(1)}</strong></div>
                </Col>
              )}
              {preview.afterBlocking !== preview.afterLatePenalty && (
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>После блокировки:</Text>
                  <div><strong>{preview.afterBlocking?.toFixed(1)}</strong></div>
                </Col>
              )}
            </Row>
          </div>
        )}
      </Card>

      {/* Поля для оценки */}
      <Divider />
      <Form layout="vertical">
        <Form.Item label="Статус" required>
          <Space>
            <Button 
              type={status === 'checked' ? 'primary' : 'default'}
              onClick={() => setStatus('checked')}
              icon={<CheckOutlined />}
            >
              Принято
            </Button>
            <Button 
              type={status === 'returned' ? 'primary' : 'default'}
              onClick={() => setStatus('returned')}
              icon={<CloseOutlined />}
              danger
            >
              Вернуть на доработку
            </Button>
          </Space>
        </Form.Item>

        <Form.Item label="Комментарий">
          <Input.TextArea 
            rows={3} 
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Приватный комментарий для студента..."
          />
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            onClick={handleSubmit} 
            loading={loading}
            block
            size="large"
          >
            {loading ? 'Сохранение...' : 'Сохранить оценку'}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default GradeForm;