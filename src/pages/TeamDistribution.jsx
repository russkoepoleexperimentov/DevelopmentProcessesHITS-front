import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  Slider,
  Radio,
  Checkbox,
  InputNumber,
  Space,
  message,
  Spin,
  Divider,
  Alert,
  Tag,
} from 'antd';
import { SaveOutlined, EyeOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import { teamTaskAPI, teamAPI, gradeDistributionAPI } from '../shared/api/endpoints';

const { Title, Text } = Typography;

export default function TeamDistribution() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [distributionType, setDistributionType] = useState('auto');
  const [weights, setWeights] = useState({});
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [preview, setPreview] = useState([]);

  useEffect(() => {
    loadData();
  }, [taskId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const teamData = await teamTaskAPI.getMyTeam(taskId);
      setTeam(teamData);
      
      const memberList = teamData.members || [];
      setMembers(memberList);
      
      const initialWeights = {};
      memberList.forEach(m => {
        initialWeights[m.userId] = 100 / memberList.length;
      });
      setWeights(initialWeights);
      
      try {
        const dist = await gradeDistributionAPI.get(teamData.id, taskId);
        if (dist.entries) {
          const newWeights = {};
          dist.entries.forEach(entry => {
            newWeights[entry.userId] = entry.points;
          });
          setWeights(newWeights);
        }
      } catch (error) {
        console.log('Нет сохранённого распределения');
      }
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePreview = () => {
    let result = [];
    
    if (distributionType === 'equal') {
      const equalShare = members.length ? 100 / members.length : 0;
      result = members.map(m => ({
        name: m.credentials,
        load: `${equalShare.toFixed(1)}%`
      }));
    } else if (distributionType === 'manual') {
      const share = selectedMembers.length ? 100 / selectedMembers.length : 0;
      result = members
        .filter(m => selectedMembers.includes(m.userId))
        .map(m => ({
          name: m.credentials,
          load: `${share.toFixed(1)}%`
        }));
    } else {
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
      result = members.map(m => ({
        name: m.credentials,
        load: totalWeight > 0 ? `${((weights[m.userId] || 0) / totalWeight * 100).toFixed(1)}%` : '0%'
      }));
    }
    
    setPreview(result);
  };

  useEffect(() => {
    updatePreview();
  }, [distributionType, weights, selectedMembers, members]);

  const handleWeightChange = (userId, value) => {
    setWeights(prev => ({ ...prev, [userId]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let entries = [];
      
      if (distributionType === 'equal') {
        const points = members.length ? 100 / members.length : 0;
        entries = members.map(m => ({ userId: m.userId, points }));
      } else if (distributionType === 'manual') {
        const points = selectedMembers.length ? 100 / selectedMembers.length : 0;
        entries = selectedMembers.map(userId => ({ userId, points }));
      } else {
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        entries = members.map(m => ({
          userId: m.userId,
          points: totalWeight > 0 ? (weights[m.userId] || 0) / totalWeight * 100 : 0
        }));
      }
      
      await gradeDistributionAPI.update(team.id, taskId, entries);
      message.success('Распределение сохранено');
      navigate(`/team/${taskId}/leader`);
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!team) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <Alert
          message="Команда не найдена"
          description="Сначала необходимо создать групповое задание и вступить в команду."
          type="warning"
          showIcon
          action={
            <Button size="small" onClick={() => navigate(-1)}>Назад</Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Card style={{ borderRadius: 12 }}>
        <Title level={3}>Настройка распределения баллов</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          Распределите баллы между участниками команды
        </Text>

        <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tag icon={<TeamOutlined />} color="blue">Команда: {team.name || 'Без названия'}</Tag>
          <Tag color="green">Участников: {members.length}</Tag>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Text strong>Способ распределения</Text>
          <Radio.Group
            value={distributionType}
            onChange={(e) => setDistributionType(e.target.value)}
            style={{ marginTop: 8, display: 'block' }}
          >
            <Space direction="vertical">
              <Radio value="auto">🤖 Автоматически (по весам)</Radio>
              <Radio value="manual">✋ Ручное (выбрать ответственных)</Radio>
              <Radio value="equal">📊 Равномерно (поровну)</Radio>
            </Space>
          </Radio.Group>
        </div>

        {distributionType === 'auto' && (
          <div style={{ marginBottom: 24 }}>
            <Text strong>Веса участников</Text>
            {members.map(member => (
              <div key={member.userId} style={{ marginTop: 12 }}>
                <Text>{member.credentials}</Text>
                <Slider
                  min={0}
                  max={100}
                  value={weights[member.userId] || 0}
                  onChange={(val) => handleWeightChange(member.userId, val)}
                />
                <Text type="secondary">{weights[member.userId] || 0}%</Text>
              </div>
            ))}
          </div>
        )}

        {distributionType === 'manual' && (
          <div style={{ marginBottom: 24 }}>
            <Text strong>Выберите ответственных</Text>
            <div style={{ marginTop: 8 }}>
              {members.map(member => (
                <div key={member.userId} style={{ marginBottom: 8 }}>
                  <Checkbox
                    checked={selectedMembers.includes(member.userId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMembers([...selectedMembers, member.userId]);
                      } else {
                        setSelectedMembers(selectedMembers.filter(id => id !== member.userId));
                      }
                    }}
                  >
                    {member.credentials}
                  </Checkbox>
                </div>
              ))}
            </div>
          </div>
        )}

        <Divider />

        <Title level={5}>Предпросмотр распределения</Title>
        {preview.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <Text>👤 {item.name}</Text>
            <Text strong style={{ color: '#52c41a' }}>{item.load}</Text>
          </div>
        ))}

        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button icon={<ReloadOutlined />} onClick={loadData}>Обновить</Button>
          <Button icon={<EyeOutlined />} onClick={updatePreview}>Предпросмотр</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            Сохранить и продолжить
          </Button>
        </div>
      </Card>
    </div>
  );
}