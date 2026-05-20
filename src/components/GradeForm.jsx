// src/components/GradeForm.jsx
import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Switch, Button, Card, Space, Typography, Divider, Spin, Alert, Row, Col, Tag, message } from 'antd';
import { CheckOutlined, CloseOutlined, CalculatorOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const GradeForm = ({ 
  assignmentConfig,      // конфигурация задания (критерии)
  initialEvaluation,     // начальные значения оценки (если есть)
  onPreview,            // функция для предпросмотра (вызов API)
  onSubmit,             // функция для отправки оценки
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

  // Инициализация начальных значений
  useEffect(() => {
    if (initialEvaluation) {
      // Заполняем весовые оценки
      if (initialEvaluation.weightedValues) {
        const scores = {};
        initialEvaluation.weightedValues.forEach(wv => {
          scores[wv.criterionId] = wv.score;
        });
        setWeightedScores(scores);
      }
      
      // Заполняем тогглы
      if (initialEvaluation.toggledValues) {
        const toggles = {};
        initialEvaluation.toggledValues.forEach(tv => {
          toggles[tv.criterionId] = tv.enabled;
        });
        setToggledBonuses(toggles);
      }
    }
  }, [initialEvaluation]);

  // При изменении любого параметра - пересчитываем предпросмотр
  useEffect(() => {
    const evaluation = buildEvaluation();
    if (Object.keys(weightedScores).length > 0) {
      handlePreview(evaluation);
    }
  }, [weightedScores, toggledBonuses, toggledQuality]);

  // Сборка объекта Evaluation для отправки
  const buildEvaluation = () => {
    const weightedValues = [];
    const toggledValues = [];

    // Весовые критерии
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

    // Бонусы/штрафы
    if (assignmentConfig?.bonusPenalties) {
      assignmentConfig.bonusPenalties.forEach(bp => {
        toggledValues.push({
          criterionId: bp.id,
          enabled: toggledBonuses[bp.id] || false
        });
      });
    }

    // Коэффициенты качества (если есть)
    if (assignmentConfig?.qualityCoefficients) {
      assignmentConfig.qualityCoefficients.forEach(qc => {
        toggledValues.push({
          criterionId: qc.id,
          enabled: toggledQuality[qc.id] || false
        });
      });
    }

    return { weightedValues, toggledValues };
  };

  // Запрос предпросмотра оценки
  const handlePreview = async (evaluation) => {
    if (!onPreview) return;
    
    setPreviewLoading(true);
    try {
      const result = await onPreview(evaluation);
      setPreview(result);
      setScore(result.finalScore);
    } catch (error) {
      console.error('Preview error:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Отправка оценки
  const handleSubmit = async () => {
    const evaluation = buildEvaluation();
    
    if (!score || score < 0) {
      message.error('Пожалуйста, дождитесь расчёта оценки');
      return;
    }

    await onSubmit(evaluation, score, status, comment);
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