// src/components/GradeForm.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Form, InputNumber, Switch, Button, Card, Space, Typography, Divider, Spin, Alert, Row, Col, Tag, message, Input } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const GradeForm = ({ 
  assignmentConfig,
  initialEvaluation,
  onPreview,
  onSubmit,
  loading = false 
}) => {
  // Состояния для весовых критериев
  const [weightedScores, setWeightedScores] = useState({});
  
  // Состояния для бонусов/штрафов
  const [toggledBonuses, setToggledBonuses] = useState({});
  
  // Состояния для коэффициентов качества
  const [toggledQuality, setToggledQuality] = useState({});
  
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
    if (initialEvaluation && !isInitialized.current) {
      isInitialized.current = true;
      
      if (initialEvaluation.weightedValues) {
        const scores = {};
        initialEvaluation.weightedValues.forEach(wv => {
          scores[wv.criterionId] = wv.score;
        });
        setWeightedScores(scores);
      }
      
      if (initialEvaluation.toggledValues) {
        const toggles = {};
        initialEvaluation.toggledValues.forEach(tv => {
          toggles[tv.criterionId] = tv.enabled;
        });
        setToggledBonuses(toggles);
      }
    }
  }, [initialEvaluation]);

  // Сборка объекта Evaluation для отправки
  const buildEvaluation = useCallback(() => {
    const weightedValues = [];
    const toggledValues = [];

    if (assignmentConfig?.weightedCriteria) {
      assignmentConfig.weightedCriteria.forEach(criterion => {
        if (weightedScores[criterion.id] !== undefined) {
          weightedValues.push({
            criterionId: criterion.id,
            score: weightedScores[criterion.id]
          });
        }
      });
    }

    if (assignmentConfig?.bonusPenalties) {
      assignmentConfig.bonusPenalties.forEach(bp => {
        toggledValues.push({
          criterionId: bp.id,
          enabled: toggledBonuses[bp.id] || false
        });
      });
    }

    if (assignmentConfig?.qualityCoefficients) {
      assignmentConfig.qualityCoefficients.forEach(qc => {
        toggledValues.push({
          criterionId: qc.id,
          enabled: toggledQuality[qc.id] || false
        });
      });
    }

    return { weightedValues, toggledValues };
  }, [assignmentConfig, weightedScores, toggledBonuses, toggledQuality]);

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
      }
    } catch (error) {
      console.error('Preview error:', error);
    } finally {
      setPreviewLoading(false);
      setTimeout(() => {
        isPreviewing.current = false;
      }, 200);
    }
  }, [onPreview]);

  // При изменении параметров - пересчитываем предпросмотр (с защитой от циклов)
  useEffect(() => {
    // Не запускаем предпросмотр при первом рендере без данных
    if (Object.keys(weightedScores).length === 0) return;
    
    const evaluation = buildEvaluation();
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
  }, [weightedScores, toggledBonuses, toggledQuality, buildEvaluation, handlePreview]);

  // Отправка оценки
  const handleSubmit = async () => {
    const evaluation = buildEvaluation();
    
    if ((score === null || score === undefined) && preview?.finalScore === undefined) {
      message.error('Пожалуйста, дождитесь расчёта оценки');
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

  // Обновление тоггла
  const updateToggle = (criterionId, enabled, type) => {
    if (type === 'bonus') {
      setToggledBonuses(prev => ({ ...prev, [criterionId]: enabled }));
    } else if (type === 'quality') {
      setToggledQuality(prev => ({ ...prev, [criterionId]: enabled }));
    }
  };

  if (!assignmentConfig) {
    return <Alert message="Конфигурация задания не найдена" type="warning" />;
  }

  const { weightedCriteria, bonusPenalties, qualityCoefficients, blockingModifiers } = assignmentConfig;
  const maxPossibleScore = weightedCriteria?.reduce((sum, c) => sum + c.maxPoints * c.weight, 0) || 0;

  return (
    <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '0 8px' }}>
      {/* Весовые критерии */}
      {weightedCriteria && weightedCriteria.length > 0 && (
        <>
          <Title level={5}>Весовые критерии</Title>
          {weightedCriteria.map(criterion => (
            <Card key={criterion.id} size="small" style={{ marginBottom: 8 }}>
              <Row align="middle" gutter={16}>
                <Col flex="auto">
                  <Text strong>{criterion.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    вес ×{criterion.weight} · макс. {criterion.maxPoints} баллов
                  </Text>
                </Col>
                <Col>
                  <InputNumber
                    min={0}
                    max={criterion.maxPoints}
                    step={0.5}
                    value={weightedScores[criterion.id] || 0}
                    onChange={(val) => updateWeightedScore(criterion.id, val)}
                    style={{ width: 100 }}
                  />
                  <Text style={{ marginLeft: 8 }}>/ {criterion.maxPoints}</Text>
                </Col>
              </Row>
            </Card>
          ))}
        </>
      )}

      {/* Бонусы и штрафы */}
      {bonusPenalties && bonusPenalties.length > 0 && (
        <>
          <Divider />
          <Title level={5}>Бонусы и штрафы</Title>
          {bonusPenalties.map(bp => (
            <Card key={bp.id} size="small" style={{ marginBottom: 8 }}>
              <Row align="middle" gutter={16}>
                <Col flex="auto">
                  <Text strong>{bp.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {bp.direction === 'ADD' ? `➕ +${bp.score} баллов` : `➖ -${Math.abs(bp.score)} баллов`}
                  </Text>
                </Col>
                <Col>
                  <Switch
                    checked={toggledBonuses[bp.id] || false}
                    onChange={(checked) => updateToggle(bp.id, checked, 'bonus')}
                    checkedChildren={<CheckOutlined />}
                    unCheckedChildren={<CloseOutlined />}
                  />
                </Col>
              </Row>
            </Card>
          ))}
        </>
      )}

      {/* Коэффициенты качества */}
      {qualityCoefficients && qualityCoefficients.length > 0 && (
        <>
          <Divider />
          <Title level={5}>Коэффициенты качества (автоматические)</Title>
          {qualityCoefficients.map(qc => (
            <Card key={qc.id} size="small" style={{ marginBottom: 8 }}>
              <Row align="middle" gutter={16}>
                <Col flex="auto">
                  <Text strong>{qc.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {qc.direction === 'ADD' 
                      ? `Бонус +${qc.score} при >${qc.threshold * 100}%` 
                      : `Штраф -${qc.score} при <${qc.threshold * 100}%`}
                  </Text>
                </Col>
                <Col>
                  <Switch
                    checked={toggledQuality[qc.id] || false}
                    onChange={(checked) => updateToggle(qc.id, checked, 'quality')}
                  />
                </Col>
              </Row>
            </Card>
          ))}
        </>
      )}

      {/* Блокирующие модификаторы (информационно) */}
      {blockingModifiers && blockingModifiers.length > 0 && (
        <>
          <Divider />
          <Alert
            message="Блокирующие модификаторы"
            description={blockingModifiers.map(b => `${b.title}: макс. ${b.maxAllowedScore} баллов`).join(', ')}
            type="info"
            showIcon
          />
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
              {preview.latePenalty > 0 && (
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Штраф за просрочку:</Text>
                  <div><strong style={{ color: '#ff4d4f' }}>-{preview.latePenalty.toFixed(1)}</strong></div>
                </Col>
              )}
              {preview.afterBlocking !== preview.afterLatePenalty && (
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Блокировка:</Text>
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