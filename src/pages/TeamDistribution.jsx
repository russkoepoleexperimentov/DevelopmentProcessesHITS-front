import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  Slider,
  Radio,
  Checkbox,
  Space,
  message,
  Spin,
  Divider,
  Alert,
  Tag,
} from 'antd';
import { SaveOutlined, EyeOutlined, ReloadOutlined, TeamOutlined, CrownOutlined } from '@ant-design/icons';
import { teamTaskAPI, teamAPI, gradeDistributionAPI, courseAPI, postAPI } from '../shared/api/endpoints';

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
  const [isCaptain, setIsCaptain] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

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
      
      const taskData = await postAPI.getById(taskId);
      console.log('Данные задачи:', taskData);
      
      let courseId = taskData.courseId;
      if (!courseId) {
        courseId = localStorage.getItem('currentCourseId');
        console.log('courseId из localStorage:', courseId);
      }
      
      let teacher = false;
      if (courseId) {
        try {
          const courseData = await courseAPI.getById(courseId);
          teacher = courseData.role === 'teacher';
          setIsTeacher(teacher);
          console.log('courseId:', courseId, 'isTeacher:', teacher);
        } catch (err) {
          console.log('Ошибка получения курса:', err);
        }
      }
      
      let captain = false;
      try {
        captain = await teamAPI.isCaptain(teamData.id);
        setIsCaptain(captain);
        console.log('isCaptain:', captain);
      } catch (error) {
        console.log('Ошибка проверки капитана:', error);
        setIsCaptain(false);
      }
      
      const canEditValue = teacher || captain;
      setCanEdit(canEditValue);
      console.log('canEdit (учитель или капитан):', canEditValue);
      
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
    if (!canEdit) return;
    setWeights(prev => ({ ...prev, [userId]: value }));
  };

  const handleManualSelect = (userId, checked) => {
    if (!canEdit) return;
    if (checked) {
      setSelectedMembers([...selectedMembers, userId]);
    } else {
      setSelectedMembers(selectedMembers.filter(id => id !== userId));
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      message.warning('Только учитель или капитан могут настраивать распределение');
      return;
    }
    
    setSaving(true);
    try {
      const distribution = await gradeDistributionAPI.get(team.id, taskId);
      const teamRawScore = distribution.teamRawScore || 5;
      
      let entries = [];
      
      if (distributionType === 'equal') {
        const basePoints = Math.floor(teamRawScore / members.length);
        const remainder = teamRawScore - (basePoints * members.length);
        entries = members.map((m, idx) => ({ 
          userId: m.userId, 
          points: idx === 0 ? basePoints + remainder : basePoints 
        }));
      } else if (distributionType === 'manual') {
        if (selectedMembers.length === 0) {
          message.warning('Выберите хотя бы одного ответственного');
          setSaving(false);
          return;
        }
        const basePoints = Math.floor(teamRawScore / selectedMembers.length);
        const remainder = teamRawScore - (basePoints * selectedMembers.length);
        entries = selectedMembers.map((userId, idx) => ({ 
          userId: userId,
          points: idx === 0 ? basePoints + remainder : basePoints 
        }));
      } else {
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        if (totalWeight === 0) {
          message.warning('Сумма весов не может быть 0');
          setSaving(false);
          return;
        }
        let totalPoints = 0;
        entries = members.map(m => {
          const points = Math.floor((weights[m.userId] || 0) / totalWeight * teamRawScore);
          totalPoints += points;
          return { userId: m.userId, points };
        });
        if (entries.length > 0 && totalPoints !== teamRawScore) {
          entries[entries.length - 1].points += (teamRawScore - totalPoints);
        }
      }
      
      const sum = entries.reduce((acc, e) => acc + e.points, 0);
      console.log('Отправляю entries:', entries);
      console.log('Сумма очков:', sum, 'Ожидалось:', teamRawScore);
      
      if (sum !== teamRawScore) {
        message.warning(`Сумма очков должна быть ${teamRawScore}, сейчас ${sum}`);
        return;
      }
      
      await gradeDistributionAPI.update(team.id, taskId, entries);
      message.success('Распределение сохранено');
      // ✅ Исправлено: переход на страницу решения (solution)
      navigate(`/team/${taskId}/solution`);
    } catch (error) {
      console.error('Ошибка:', error);
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
          title="Команда не найдена"
          description="Сначала необходимо вступить в команду."
          type="warning"
          showIcon
          action={
            <Button size="small" onClick={() => navigate(`/team/${taskId}/select`)}>
              Выбрать команду
            </Button>
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
          {canEdit 
            ? "Распределите баллы между участниками команды"
            : "Просмотр распределения баллов"
          }
        </Text>

        <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tag icon={<TeamOutlined />} color="blue">Команда: {team.name || 'Без названия'}</Tag>
          <Tag color="green">Участников: {members.length}</Tag>
          {isTeacher && <Tag color="purple">👨‍🏫 Учитель</Tag>}
          {isCaptain && <Tag color="gold" icon={<CrownOutlined />}>Капитан</Tag>}
          {canEdit && <Tag color="cyan">✏️ Режим редактирования</Tag>}
        </div>

        {!canEdit && (
          <Alert
            title="Только для просмотра"
            description="Настройка распределения баллов доступна только учителю или капитану команды."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {canEdit && (
          <>
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
                        onChange={(e) => handleManualSelect(member.userId, e.target.checked)}
                      >
                        {member.credentials}
                      </Checkbox>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
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
          {canEdit && (
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
              Сохранить и продолжить
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}