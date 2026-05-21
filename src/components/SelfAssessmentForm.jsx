// src/components/SelfAssessmentForm.jsx
import React, { useState, useEffect } from 'react';
import { Card, InputNumber, Switch, Button, Typography, Divider, Row, Col, message, Space } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const SelfAssessmentForm = ({ 
  assignmentConfig,      // конфигурация задания (критерии)
  initialAssessment,     // начальные значения самооценки (если есть)
  onChange,              // callback при изменении самооценки
  readOnly = false       // режим только для чтения
}) => {
  // Состояния для весовых критериев
  const [weightedScores, setWeightedScores] = useState({});
  
  // Состояния для бонусов/штрафов
  const [toggledBonuses, setToggledBonuses] = useState({});
  const [toggledQuality, setToggledQuality] = useState({});
  const [toggledBlocking, setToggledBlocking] = useState({});
  
  // Флаг, что форма была изменена
  const [isDirty, setIsDirty] = useState(false);

  // Инициализация начальных значений
  useEffect(() => {
    if (!initialAssessment) {
      setWeightedScores({});
      setToggledBonuses({});
      setToggledQuality({});
      setToggledBlocking({});
      setIsDirty(false);
      return;
    }

    const scores = {};
    initialAssessment.weightedValues?.forEach(wv => {
      scores[wv.criterionId] = wv.score;
    });
    setWeightedScores(scores);
    
    const toggles = {};
    initialAssessment.toggledValues?.forEach(tv => {
      toggles[tv.criterionId] = tv.enabled;
    });
    setToggledBonuses(toggles);
    setToggledQuality(toggles);
    setToggledBlocking(toggles);
    setIsDirty(false);
  }, [initialAssessment]);

  // Сборка объекта самооценки
  const buildSelfAssessment = () => {
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

    if (assignmentConfig?.blockingModifiers) {
      assignmentConfig.blockingModifiers.forEach(blocking => {
        toggledValues.push({
          criterionId: blocking.id,
          enabled: toggledBlocking[blocking.id] || false
        });
      });
    }

    return { weightedValues, toggledValues };
  };

  // При изменении данных уведомляем родителя
  useEffect(() => {
    if (isDirty && onChange) {
      const assessment = buildSelfAssessment();
      onChange(assessment);
    }
  }, [weightedScores, toggledBonuses, toggledQuality, toggledBlocking, isDirty]);

  // Обновление весового критерия
  const updateWeightedScore = (criterionId, value) => {
    setWeightedScores(prev => ({ ...prev, [criterionId]: value }));
    setIsDirty(true);
  };

  // Обновление тоггла
  const updateToggle = (criterionId, enabled, type = 'bonus') => {
    if (type === 'quality') {
      setToggledQuality(prev => ({ ...prev, [criterionId]: enabled }));
    } else if (type === 'blocking') {
      setToggledBlocking(prev => ({ ...prev, [criterionId]: enabled }));
    } else {
      setToggledBonuses(prev => ({ ...prev, [criterionId]: enabled }));
    }
    setIsDirty(true);
  };

  // Расчёт предварительной оценки (для отображения)
  const calculatePreview = () => {
    let total = 0;
    let maxTotal = 0;

    if (assignmentConfig?.weightedCriteria) {
      assignmentConfig.weightedCriteria.forEach(criterion => {
        const score = weightedScores[criterion.id] || 0;
        total += score * criterion.weight;
        maxTotal += criterion.maxPoints * criterion.weight;
      });
    }

    if (assignmentConfig?.bonusPenalties) {
      assignmentConfig.bonusPenalties.forEach(bp => {
        if (toggledBonuses[bp.id]) {
          if (bp.direction === 'ADD') {
            total += bp.score;
          } else {
            total -= bp.score;
          }
        }
      });
    }

    if (assignmentConfig?.qualityCoefficients) {
      assignmentConfig.qualityCoefficients.forEach(qc => {
        if (!toggledQuality[qc.id] || maxTotal <= 0) return;
        const scoreRatio = total / maxTotal;
        const threshold = qc.threshold > 1 ? qc.threshold / 100 : qc.threshold;
        if (qc.direction === 'ADD' && scoreRatio > threshold) {
          total += qc.score;
        } else if (qc.direction !== 'ADD' && scoreRatio < threshold) {
          total -= qc.score;
        }
      });
    }

    if (assignmentConfig?.blockingModifiers) {
      assignmentConfig.blockingModifiers.forEach(blocking => {
        if (toggledBlocking[blocking.id] && blocking.maxAllowedScore != null) {
          total = Math.min(total, blocking.maxAllowedScore);
        }
      });
    }

    return { total: Math.max(0, total), maxTotal };
  };

  if (!assignmentConfig) {
    return (
      <div style={{ padding: 24, textAlign: 'center', background: '#f5f5f5', borderRadius: 8 }}>
        <Text type="secondary">Нет настроенных критериев для самооценки</Text>
      </div>
    );
  }

  const { weightedCriteria, bonusPenalties, qualityCoefficients, blockingModifiers } = assignmentConfig;
  const preview = calculatePreview();
  const hasWeighted = weightedCriteria && weightedCriteria.length > 0;
  const hasBonuses = bonusPenalties && bonusPenalties.length > 0;
  const hasQuality = qualityCoefficients && qualityCoefficients.length > 0;
  const hasBlocking = blockingModifiers && blockingModifiers.length > 0;

  if (!hasWeighted && !hasBonuses && !hasQuality && !hasBlocking) {
    return (
      <div style={{ padding: 24, textAlign: 'center', background: '#f5f5f5', borderRadius: 8 }}>
        <Text type="secondary">Нет критериев для самооценки</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 8px' }}>
      {/* Весовые критерии */}
      {hasWeighted && (
        <>
          <Title level={5}>Оцените себя по критериям</Title>
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
                    disabled={readOnly}
                  />
                  <Text style={{ marginLeft: 8 }}>/ {criterion.maxPoints}</Text>
                </Col>
              </Row>
            </Card>
          ))}
        </>
      )}

      {/* Бонусы и штрафы */}
      {hasBonuses && (
        <>
          <Divider />
          <Title level={5}>Дополнительные баллы</Title>
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
                    disabled={readOnly}
                  />
                </Col>
              </Row>
            </Card>
          ))}
        </>
      )}

      {/* Коэффициенты качества */}
      {hasQuality && (
        <>
          <Divider />
          <Title level={5}>Критерии качества</Title>
          {qualityCoefficients.map(qc => (
            <Card key={qc.id} size="small" style={{ marginBottom: 8 }}>
              <Row align="middle" gutter={16}>
                <Col flex="auto">
                  <Text strong>{qc.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {qc.direction === 'ADD'
                      ? `бонус +${qc.score} при результате выше ${Math.round((qc.threshold > 1 ? qc.threshold : qc.threshold * 100) || 0)}%`
                      : `штраф -${qc.score} при результате ниже ${Math.round((qc.threshold > 1 ? qc.threshold : qc.threshold * 100) || 0)}%`}
                  </Text>
                </Col>
                <Col>
                  <Switch
                    checked={toggledQuality[qc.id] || false}
                    onChange={(checked) => updateToggle(qc.id, checked, 'quality')}
                    checkedChildren={<CheckOutlined />}
                    unCheckedChildren={<CloseOutlined />}
                    disabled={readOnly}
                  />
                </Col>
              </Row>
            </Card>
          ))}
        </>
      )}

      {/* Блокирующие критерии */}
      {hasBlocking && (
        <>
          <Divider />
          <Title level={5}>Ограничивающие критерии</Title>
          {blockingModifiers.map(blocking => (
            <Card key={blocking.id} size="small" style={{ marginBottom: 8 }}>
              <Row align="middle" gutter={16}>
                <Col flex="auto">
                  <Text strong>{blocking.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    максимум {blocking.maxAllowedScore} баллов при включении
                  </Text>
                </Col>
                <Col>
                  <Switch
                    checked={toggledBlocking[blocking.id] || false}
                    onChange={(checked) => updateToggle(blocking.id, checked, 'blocking')}
                    checkedChildren={<CheckOutlined />}
                    unCheckedChildren={<CloseOutlined />}
                    disabled={readOnly}
                  />
                </Col>
              </Row>
            </Card>
          ))}
        </>
      )}

      <Divider />

      {/* Предпросмотр самооценки */}
      <Card style={{ background: '#e6f7ff' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Text strong style={{ fontSize: 16 }}>Ваша самооценка</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', marginLeft: 12, color: '#1890ff' }}>
              {preview.total.toFixed(1)} / {preview.maxTotal.toFixed(1)}
            </Text>
          </Col>
          <Col>
            <Text type="secondary">
              {preview.maxTotal > 0 ? ((preview.total / preview.maxTotal) * 100).toFixed(0) : 0}%
            </Text>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default SelfAssessmentForm;
