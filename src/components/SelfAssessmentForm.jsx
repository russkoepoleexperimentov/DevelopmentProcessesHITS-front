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
  
  // Флаг, что форма была изменена
  const [isDirty, setIsDirty] = useState(false);

  // Инициализация начальных значений
  useEffect(() => {
    if (initialAssessment) {
      if (initialAssessment.weightedValues) {
        const scores = {};
        initialAssessment.weightedValues.forEach(wv => {
          scores[wv.criterionId] = wv.score;
        });
        setWeightedScores(scores);
      }
      
      if (initialAssessment.toggledValues) {
        const toggles = {};
        initialAssessment.toggledValues.forEach(tv => {
          toggles[tv.criterionId] = tv.enabled;
        });
        setToggledBonuses(toggles);
      }
    }
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

    return { weightedValues, toggledValues };
  };

  // При изменении данных уведомляем родителя
  useEffect(() => {
    if (isDirty && onChange) {
      const assessment = buildSelfAssessment();
      onChange(assessment);
    }
  }, [weightedScores, toggledBonuses, isDirty]);

  // Обновление весового критерия
  const updateWeightedScore = (criterionId, value) => {
    setWeightedScores(prev => ({ ...prev, [criterionId]: value }));
    setIsDirty(true);
  };

  // Обновление тоггла
  const updateToggle = (criterionId, enabled) => {
    setToggledBonuses(prev => ({ ...prev, [criterionId]: enabled }));
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

    return { total: Math.max(0, total), maxTotal };
  };

  if (!assignmentConfig) {
    return (
      <div style={{ padding: 24, textAlign: 'center', background: '#f5f5f5', borderRadius: 8 }}>
        <Text type="secondary">Нет настроенных критериев для самооценки</Text>
      </div>
    );
  }

  const { weightedCriteria, bonusPenalties } = assignmentConfig;
  const preview = calculatePreview();
  const hasWeighted = weightedCriteria && weightedCriteria.length > 0;
  const hasBonuses = bonusPenalties && bonusPenalties.length > 0;

  if (!hasWeighted && !hasBonuses) {
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
                    onChange={(checked) => updateToggle(bp.id, checked)}
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