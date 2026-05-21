// src/pages/CriteriaPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Button, Input, InputNumber, Space, Typography, 
  Divider, message, Spin, Tag, Alert
} from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { postAPI } from '../shared/api/endpoints';
import { convertBackendToFrontend, convertFrontendToBackend } from '../shared/utils/convertCriteria';

const { Title, Text } = Typography;

export default function CriteriaPage() {
  const { courseId, postId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Состояния всех критериев
  const [weightedCriteria, setWeightedCriteria] = useState([
    { id: 'w1', title: 'Функциональность', maxPoints: 10, weight: 1.0 }
  ]);
  const [bonusPenalties, setBonusPenalties] = useState([]);
  const [qualityCoefficients, setQualityCoefficients] = useState([]);
  const [blockingModifiers, setBlockingModifiers] = useState([]);
  const [failThreshold, setFailThreshold] = useState(null);
  const [successThreshold, setSuccessThreshold] = useState(null);
  const [studentScoreWeight, setStudentScoreWeight] = useState(0);
  const [penaltyPerDay, setPenaltyPerDay] = useState(0);
  const [maxDays, setMaxDays] = useState(0);

  // Загрузка существующих критериев (если редактируем)
  useEffect(() => {
    const savedConfig = sessionStorage.getItem('tempCriteriaConfig');
    
    if (postId) {
      setLoading(true);
      postAPI.getById(postId)
        .then(data => {
          if (data.criteria && data.criteria.length > 0) {
            const frontendConfig = convertBackendToFrontend(data.criteria);
            if (frontendConfig) {
              loadConfig(frontendConfig);
            }
          } else if (savedConfig) {
            loadConfig(JSON.parse(savedConfig));
          }
          
          if (data.failThreshold !== undefined) setFailThreshold(data.failThreshold);
          if (data.successThreshold !== undefined) setSuccessThreshold(data.successThreshold);
          if (data.studentScoreWeight !== undefined) setStudentScoreWeight(data.studentScoreWeight);
          if (data.penaltyPerDay !== undefined) setPenaltyPerDay(data.penaltyPerDay);
          if (data.maxDays !== undefined) setMaxDays(data.maxDays);
        })
        .catch(err => {
          console.error('Ошибка загрузки:', err);
          message.error('Ошибка загрузки');
        })
        .finally(() => setLoading(false));
    } else if (savedConfig) {
      loadConfig(JSON.parse(savedConfig));
    }
  }, [postId]);

  const loadConfig = (config) => {
    if (config.weightedCriteria) setWeightedCriteria(config.weightedCriteria);
    if (config.bonusPenalties) setBonusPenalties(config.bonusPenalties);
    if (config.qualityCoefficients) setQualityCoefficients(config.qualityCoefficients);
    if (config.blockingModifiers) setBlockingModifiers(config.blockingModifiers);
    if (config.failThreshold !== undefined) setFailThreshold(config.failThreshold);
    if (config.successThreshold !== undefined) setSuccessThreshold(config.successThreshold);
    if (config.studentScoreWeight !== undefined) setStudentScoreWeight(config.studentScoreWeight);
    if (config.penaltyPerDay !== undefined) setPenaltyPerDay(config.penaltyPerDay);
    if (config.maxDays !== undefined) setMaxDays(config.maxDays);
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // ========== Весовые критерии ==========
  const addWeightedCriterion = () => {
    setWeightedCriteria([...weightedCriteria, {
      id: generateId(),
      title: 'Новый критерий',
      maxPoints: 10,
      weight: 0
    }]);
  };

  const updateWeightedCriterion = (id, field, val) => {
    setWeightedCriteria(weightedCriteria.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const removeWeightedCriterion = (id) => {
    setWeightedCriteria(weightedCriteria.filter(c => c.id !== id));
  };

  // ========== Бонусы/штрафы ==========
  const addBonusPenalty = (direction) => {
    setBonusPenalties([...bonusPenalties, {
      id: generateId(),
      title: direction === 'ADD' ? 'Новый бонус' : 'Новый штраф',
      score: direction === 'ADD' ? 1 : -1,
      direction
    }]);
  };

  const updateBonusPenalty = (id, field, val) => {
    setBonusPenalties(bonusPenalties.map(bp => bp.id === id ? { ...bp, [field]: val } : bp));
  };

  const removeBonusPenalty = (id) => {
    setBonusPenalties(bonusPenalties.filter(bp => bp.id !== id));
  };

  // ========== Коэффициенты качества ==========
  const addQualityCoefficient = () => {
    setQualityCoefficients([...qualityCoefficients, {
      id: generateId(),
      title: 'Новый коэффициент',
      threshold: 0.7,
      score: 1,
      direction: 'ADD'
    }]);
  };

  const updateQualityCoefficient = (id, field, val) => {
    setQualityCoefficients(qualityCoefficients.map(q => q.id === id ? { ...q, [field]: val } : q));
  };

  const removeQualityCoefficient = (id) => {
    setQualityCoefficients(qualityCoefficients.filter(q => q.id !== id));
  };

  // ========== Блокирующие модификаторы ==========
  const addBlockingModifier = () => {
    setBlockingModifiers([...blockingModifiers, {
      id: generateId(),
      title: 'Новый блокирующий модификатор',
      maxAllowedScore: 5
    }]);
  };

  const updateBlockingModifier = (id, field, val) => {
    setBlockingModifiers(blockingModifiers.map(b => b.id === id ? { ...b, [field]: val } : b));
  };

  const removeBlockingModifier = (id) => {
    setBlockingModifiers(blockingModifiers.filter(b => b.id !== id));
  };

  // Нормализация весов
  const normalizeWeights = () => {
    const totalWeight = weightedCriteria.reduce((sum, c) => sum + (c.weight || 0), 0);
    if (totalWeight === 0) {
      const equalWeight = 1 / weightedCriteria.length;
      setWeightedCriteria(weightedCriteria.map(c => ({ ...c, weight: equalWeight })));
    } else {
      setWeightedCriteria(weightedCriteria.map(c => ({ ...c, weight: (c.weight || 0) / totalWeight })));
    }
    message.success('Веса нормализованы');
  };

  // Автоматическая нормализация весов перед сохранением
  const getNormalizedWeightedCriteria = () => {
    const totalWeight = weightedCriteria.reduce((sum, c) => sum + (c.weight || 0), 0);
    
    // Если нет весовых критериев или сумма уже равна 1, возвращаем как есть
    if (weightedCriteria.length === 0 || Math.abs(totalWeight - 1) < 0.001) {
      return weightedCriteria;
    }
    
    // Нормализуем веса
    console.log(`Автонормализация: сумма весов = ${totalWeight}, нормализуем до 1`);
    return weightedCriteria.map(c => ({
      ...c,
      weight: c.weight / totalWeight
    }));
  };

  // Сохранение
  const handleSave = async () => {
    setSaving(true);
    
    // Автоматически нормализуем веса перед сохранением
    const normalizedWeightedCriteria = getNormalizedWeightedCriteria();
    
    const frontendConfig = {
      weightedCriteria: normalizedWeightedCriteria,
      bonusPenalties,
      qualityCoefficients,
      blockingModifiers,
      failThreshold,
      successThreshold,
      studentScoreWeight,
      penaltyPerDay,
      maxDays
    };

    try {
      if (postId) {
        console.log('Обновляем критерии существующего задания:', postId);
        const backendCriteria = convertFrontendToBackend(frontendConfig);
        
        await postAPI.update(postId, { 
          criteria: backendCriteria,
          failThreshold,
          successThreshold,
          studentScoreWeight,
          penaltyPerDay,
          maxDays
        });
        message.success('Критерии сохранены на сервере');
      } else {
        console.log('Сохраняем критерии в sessionStorage для нового задания');
        sessionStorage.setItem('tempCriteriaConfig', JSON.stringify(frontendConfig));
        message.success('Критерии сохранены (временное сохранение)');
      }
      navigate(-1);
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      if (err.response?.data) {
        console.error('Детали ошибки:', err.response.data);
        message.error('Ошибка сохранения: ' + (err.response.data?.message || err.message));
      } else {
        message.error('Ошибка сохранения: ' + (err.message || 'Неизвестная ошибка'));
      }
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = weightedCriteria.reduce((sum, c) => sum + (c.weight || 0), 0);
  const isValidWeight = Math.abs(totalWeight - 1) < 0.01;

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
        <Title level={3} style={{ margin: 0 }}>Настройка критериев оценивания</Title>
      </div>

      {/* Весовые критерии */}
      <Card title="📊 Весовые критерии" style={{ marginBottom: 16 }}>
        {weightedCriteria.map(c => (
          <div key={c.id} style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Input 
              placeholder="Название"
              value={c.title}
              onChange={e => updateWeightedCriterion(c.id, 'title', e.target.value)}
              style={{ flex: 2, minWidth: 150 }}
            />
            <InputNumber
              placeholder="Макс. баллов"
              value={c.maxPoints}
              onChange={val => updateWeightedCriterion(c.id, 'maxPoints', val)}
              min={0}
              step={0.5}
              style={{ width: 120 }}
            />
            <InputNumber
              placeholder="Вес (0..1)"
              value={c.weight}
              onChange={val => updateWeightedCriterion(c.id, 'weight', val)}
              min={0}
              max={1}
              step={0.1}
              style={{ width: 120 }}
            />
            <Button icon={<DeleteOutlined />} danger onClick={() => removeWeightedCriterion(c.id)} />
          </div>
        ))}
        <Button icon={<PlusOutlined />} onClick={addWeightedCriterion}>Добавить критерий</Button>
        <div style={{ marginTop: 12 }}>
          <Text type={isValidWeight ? 'success' : 'danger'}>
            Сумма весов: {totalWeight.toFixed(4)} {!isValidWeight && '(должна быть 1)'}
          </Text>
          <Button size="small" onClick={normalizeWeights} style={{ marginLeft: 12 }}>Нормализовать</Button>
        </div>
        {!isValidWeight && weightedCriteria.length > 0 && (
          <Alert
            message="Внимание!"
            description="Сумма весов должна быть равна 1. При сохранении веса будут автоматически нормализованы."
            type="warning"
            showIcon
            style={{ marginTop: 12 }}
          />
        )}
      </Card>

      {/* Бонусы и штрафы */}
      <Card title="🎯 Бонусы и штрафы" style={{ marginBottom: 16 }}>
        {bonusPenalties.map(bp => (
          <div key={bp.id} style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Input 
              placeholder="Название"
              value={bp.title}
              onChange={e => updateBonusPenalty(bp.id, 'title', e.target.value)}
              style={{ flex: 2, minWidth: 150 }}
            />
            <InputNumber
              placeholder="Баллы"
              value={bp.score}
              onChange={val => updateBonusPenalty(bp.id, 'score', val)}
              style={{ width: 100 }}
            />
            <Tag color={bp.direction === 'ADD' ? 'green' : 'red'}>
              {bp.direction === 'ADD' ? '➕ Бонус' : '➖ Штраф'}
            </Tag>
            <Button icon={<DeleteOutlined />} danger onClick={() => removeBonusPenalty(bp.id)} />
          </div>
        ))}
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => addBonusPenalty('ADD')}>Добавить бонус</Button>
          <Button icon={<PlusOutlined />} onClick={() => addBonusPenalty('SUBTRACT')}>Добавить штраф</Button>
        </Space>
      </Card>

      {/* Коэффициенты качества */}
      <Card title="⚡ Коэффициенты качества (автоматические)" style={{ marginBottom: 16 }}>
        {qualityCoefficients.map(q => (
          <div key={q.id} style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Input 
              placeholder="Название"
              value={q.title}
              onChange={e => updateQualityCoefficient(q.id, 'title', e.target.value)}
              style={{ flex: 2, minWidth: 150 }}
            />
            <InputNumber
              placeholder="Порог (0..1)"
              value={q.threshold}
              onChange={val => updateQualityCoefficient(q.id, 'threshold', val)}
              min={0}
              max={1}
              step={0.1}
              style={{ width: 120 }}
            />
            <InputNumber
              placeholder="Баллы"
              value={q.score}
              onChange={val => updateQualityCoefficient(q.id, 'score', val)}
              style={{ width: 100 }}
            />
            <select 
              value={q.direction}
              onChange={e => updateQualityCoefficient(q.id, 'direction', e.target.value)}
              style={{ padding: 4, borderRadius: 4 }}
            >
              <option value="ADD">Выше порога → +баллы</option>
              <option value="SUBTRACT">Ниже порога → -баллы</option>
            </select>
            <Button icon={<DeleteOutlined />} danger onClick={() => removeQualityCoefficient(q.id)} />
          </div>
        ))}
        <Button icon={<PlusOutlined />} onClick={addQualityCoefficient}>Добавить коэффициент качества</Button>
      </Card>

      {/* Блокирующие модификаторы */}
      <Card title="🔒 Блокирующие модификаторы" style={{ marginBottom: 16 }}>
        {blockingModifiers.map(b => (
          <div key={b.id} style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Input 
              placeholder="Название"
              value={b.title}
              onChange={e => updateBlockingModifier(b.id, 'title', e.target.value)}
              style={{ flex: 2, minWidth: 150 }}
            />
            <InputNumber
              placeholder="Макс. допустимый балл"
              value={b.maxAllowedScore}
              onChange={val => updateBlockingModifier(b.id, 'maxAllowedScore', val)}
              min={0}
              step={0.5}
              style={{ width: 180 }}
            />
            <Button icon={<DeleteOutlined />} danger onClick={() => removeBlockingModifier(b.id)} />
          </div>
        ))}
        <Button icon={<PlusOutlined />} onClick={addBlockingModifier}>Добавить блокирующий модификатор</Button>
      </Card>

      {/* Дополнительные параметры */}
      <Card title="⚙️ Дополнительные параметры" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          <div>
            <Text>Порог незачёта (0..1):</Text>
            <InputNumber 
              value={failThreshold}
              onChange={setFailThreshold}
              min={0}
              max={1}
              step={0.05}
              style={{ width: '100%', marginTop: 4 }}
              placeholder="Не использовать"
            />
          </div>
          <div>
            <Text>Порог автомата (0..1):</Text>
            <InputNumber 
              value={successThreshold}
              onChange={setSuccessThreshold}
              min={0}
              max={1}
              step={0.05}
              style={{ width: '100%', marginTop: 4 }}
              placeholder="Не использовать"
            />
          </div>
          <div>
            <Text>Вес самооценки (0..1):</Text>
            <InputNumber 
              value={studentScoreWeight}
              onChange={setStudentScoreWeight}
              min={0}
              max={1}
              step={0.1}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
          <div>
            <Text>Штраф за просрочку (баллов/день):</Text>
            <InputNumber 
              value={penaltyPerDay}
              onChange={setPenaltyPerDay}
              min={0}
              step={0.5}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
          <div>
            <Text>Макс. дней просрочки:</Text>
            <InputNumber 
              value={maxDays}
              onChange={setMaxDays}
              min={0}
              step={1}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
        </div>
      </Card>

      <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} block size="large">
        Сохранить критерии
      </Button>
    </div>
  );
}