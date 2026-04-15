import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  Select,
  List,
  Tag,
  message,
  Spin,
  Alert,
  Divider,
  Statistic,
  Row,
  Col,
} from 'antd';
import { UserOutlined, CrownOutlined, TeamOutlined, CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { teamTaskAPI, teamAPI, postAPI, courseAPI, usersAPI } from '../shared/api/endpoints';

const { Title, Text } = Typography;

export default function TeamLeader() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [isCaptain, setIsCaptain] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [captainMode, setCaptainMode] = useState('firstMember');
  const [selectedLeader, setSelectedLeader] = useState(null);
  const [votingActive, setVotingActive] = useState(false);
  const [votedFor, setVotedFor] = useState(null);
  const [votingEndTime, setVotingEndTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [votingDurationMinutes, setVotingDurationMinutes] = useState(60);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    loadData();
  }, [taskId]);

  useEffect(() => {
    if (votingActive && votingEndTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = votingEndTime - now;
        if (remaining <= 0) {
          clearInterval(interval);
          setTimeLeft(0);
          setVotingActive(false);
          checkVotingResult();
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [votingActive, votingEndTime]);

  const loadData = async () => {
    setLoading(true);
    try {
      try {
        const userData = await usersAPI.me();
        setCurrentUserId(userData.id);
      } catch (error) {
        console.error('Ошибка получения пользователя:', error);
      }
      
      let teamData;
      try {
        teamData = await teamTaskAPI.getMyTeam(taskId);
      } catch (error) {
        if (error.message?.includes('404')) {
          setTeam(null);
          setMembers([]);
          setLoading(false);
          return;
        }
        throw error;
      }
      setTeam(teamData);
      
      const memberList = teamData.members || [];
      setMembers(memberList);
      
      const captainStatus = await teamAPI.isCaptain(teamData.id);
      setIsCaptain(captainStatus);
      
      const taskData = await postAPI.getById(taskId);
      setCaptainMode(taskData.captainMode || 'firstMember');
      
      const durationMinutes = taskData.votingDurationMinutes || (taskData.votingDurationHours ? taskData.votingDurationHours * 60 : 60);
      setVotingDurationMinutes(durationMinutes);
      
      const courseId = localStorage.getItem('currentCourseId');
      if (courseId) {
        try {
          const courseData = await courseAPI.getById(courseId);
          setIsTeacher(courseData.role === 'teacher');
        } catch (error) {
          setIsTeacher(false);
        }
      }
      
      if (currentUserId) {
        const savedVote = localStorage.getItem(`vote_${taskId}_${teamData.id}_${currentUserId}`);
        if (savedVote) {
          setVotedFor(savedVote);
        }
      }
      
      await checkVotingStatus(teamData.id);
      
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkVotingStatus = async (teamId) => {
    try {
      const savedEndTime = localStorage.getItem(`voting_end_${taskId}_${teamId}`);
      if (savedEndTime && parseInt(savedEndTime) > Date.now()) {
        setVotingActive(true);
        setVotingEndTime(parseInt(savedEndTime));
      } else if (savedEndTime && parseInt(savedEndTime) <= Date.now()) {
        localStorage.removeItem(`voting_end_${taskId}_${teamId}`);
        await checkVotingResult();
      }
    } catch (error) {
      console.log('Ошибка проверки статуса голосования');
    }
  };

  const checkVotingResult = async () => {
    try {
      const teamData = await teamTaskAPI.getMyTeam(taskId);
      if (teamData.captainId) {
        const captain = teamData.members.find(m => m.userId === teamData.captainId);
        message.success(`Капитан выбран: ${captain?.credentials}`);
        await loadData();
      }
    } catch (error) {
      console.log('Ошибка проверки результата голосования');
    }
  };

  const formatDurationText = (minutes) => {
    if (minutes === 1) return '1 минуту';
    if (minutes < 60) return `${minutes} минут`;
    if (minutes === 60) return '1 час';
    if (minutes < 1440) return `${minutes / 60} часа`;
    if (minutes === 1440) return '1 день';
    return `${minutes / 1440} дня`;
  };

  const handleStartVoting = async () => {
    if (!isTeacher) {
      message.warning('Только учитель может запустить голосование');
      return;
    }
    
    if (members.length < 2) {
      message.warning('Для запуска голосования необходимо минимум 2 участника');
      return;
    }
    
    setSaving(true);
    try {
      await teamAPI.startVoting(team.id);
      setVotingActive(true);
      
      const endTime = Date.now() + votingDurationMinutes * 60 * 1000;
      localStorage.setItem(`voting_end_${taskId}_${team.id}`, endTime);
      setVotingEndTime(endTime);
      
      message.success(`Голосование запущено! Длительность: ${formatDurationText(votingDurationMinutes)}`);
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (candidateId) => {
    const voteKey = `vote_${taskId}_${team.id}_${currentUserId}`;
    const existingVote = localStorage.getItem(voteKey);
    
    if (existingVote) {
      message.warning('Вы уже проголосовали');
      return;
    }
    
    setSaving(true);
    try {
      await teamAPI.vote(team.id, candidateId);
      localStorage.setItem(voteKey, candidateId);
      setVotedFor(candidateId);
      message.success('Голос учтён!');
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTeacherAssign = async (userId) => {
    if (!isTeacher) {
      message.warning('Только учитель может назначить капитана');
      return;
    }
    
    setSaving(true);
    try {
      await teamAPI.setFixedCaptain(team.id, userId);
      const member = members.find(m => m.userId === userId);
      message.success(`Капитан назначен: ${member?.credentials}`);
      await loadData();
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatTimeLeft = (ms) => {
    if (!ms) return '0ч 0м';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}ч ${minutes}м`;
    if (minutes > 0) return `${minutes}м ${seconds}с`;
    return `${seconds}с`;
  };

  const getProgressPercent = () => {
    const totalDuration = votingDurationMinutes * 60 * 1000;
    const elapsed = totalDuration - (timeLeft || 0);
    return Math.min(100, (elapsed / totalDuration) * 100);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const currentCaptain = members.find(m => m.userId === team?.captainId);
  
  const hasCaptainFromAPI = !!team?.captainId;
  const hasCaptainFromMembers = !!currentCaptain;
  const hasCaptainFromUser = isCaptain;
  const hasCaptain = hasCaptainFromAPI || hasCaptainFromMembers || hasCaptainFromUser;
  
  let captainDisplayName = null;
  if (currentCaptain) {
    captainDisplayName = currentCaptain.credentials;
  } else if (hasCaptainFromAPI && team?.captainId) {
    const foundCaptain = members.find(m => m.userId === team.captainId);
    captainDisplayName = foundCaptain?.credentials || 'Назначен';
  } else if (isCaptain) {
    captainDisplayName = 'Вы';
  }

  // Режим "первый вступивший"
  if (captainMode === 'firstMember') {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <Card>
          <Title level={3}>👑 Выбор лидера команды</Title>
          <Text type="secondary">Первый вступивший в команду становится капитаном</Text>
          <Divider />
          <Row gutter={16}>
            <Col span={12}>
              <Statistic title="Команда" value={team?.name || 'Без названия'} prefix={<TeamOutlined />} />
            </Col>
            <Col span={12}>
              <Statistic title="Участников" value={members.length} prefix={<UserOutlined />} />
            </Col>
          </Row>
          {hasCaptain ? (
            <>
              <Alert type="success" message={`Капитан команды: ${captainDisplayName || 'Назначен'}`} icon={<CrownOutlined />} style={{ marginTop: 16 }} />
              <Button type="primary" size="large" block style={{ marginTop: 24 }} onClick={() => navigate(`/team/${taskId}/solution`)}>
                Продолжить к решению
              </Button>
            </>
          ) : (
            <Alert type="info" message="Ожидание капитана" description="Первый вступивший в команду станет капитаном" style={{ marginTop: 16 }} />
          )}
          <Divider />
          <Text strong>Участники команды:</Text>
          <div style={{ marginTop: 8 }}>
            {members.map((member) => (
              <Tag key={member.userId} icon={<UserOutlined />} color="blue">
                {member.credentials}
                {(member.userId === team?.captainId || member.role === 'leader') && <CrownOutlined style={{ marginLeft: 8, color: '#faad14' }} />}
              </Tag>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // Режим "назначает учитель" — кнопка показывается всегда, если есть участники
  if (captainMode === 'teacherFixed') {
    // Для этого режима считаем, что капитан назначен учителем, если в команде есть участники
    const hasTeamMembers = members.length > 0;
    
    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <Card>
          <Title level={3}>👨‍🏫 Назначение капитана</Title>
          <Text type="secondary">Учитель назначает капитана команды</Text>
          <Divider />
          <Row gutter={16}>
            <Col span={12}>
              <Statistic title="Команда" value={team?.name || 'Без названия'} prefix={<TeamOutlined />} />
            </Col>
            <Col span={12}>
              <Statistic title="Участников" value={members.length} prefix={<UserOutlined />} />
            </Col>
          </Row>
          
          {hasTeamMembers ? (
            <>
              <Alert
                type="success"
                message="Капитан назначен учителем"
                icon={<CrownOutlined />}
                style={{ marginTop: 16 }}
              />
              <Button
                type="primary"
                size="large"
                block
                style={{ marginTop: 24 }}
                onClick={() => navigate(`/team/${taskId}/solution`)}
              >
                Продолжить к решению
              </Button>
            </>
          ) : (
            <Alert
              type="info"
              message="Ожидание участников"
              description="Добавьте участников в команду для назначения капитана"
              style={{ marginTop: 16 }}
            />
          )}
          
          <Divider />
          <Text strong>Участники команды:</Text>
          <div style={{ marginTop: 8 }}>
            {members.map((member) => (
              <Tag key={member.userId} icon={<UserOutlined />} color="blue">
                {member.credentials}
              </Tag>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // Режим "голосование"
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Card>
        <Title level={3}>🗳️ Выбор капитана голосованием</Title>
        <Text type="secondary">Участники голосуют за кандидата</Text>
        <Divider />
        <Row gutter={16}>
          <Col span={12}>
            <Statistic title="Команда" value={team?.name || 'Без названия'} prefix={<TeamOutlined />} />
          </Col>
          <Col span={12}>
            <Statistic title="Участников" value={members.length} prefix={<UserOutlined />} />
          </Col>
        </Row>

        {hasCaptain ? (
          <>
            <Alert type="success" message={`Капитан команды: ${captainDisplayName || 'Назначен'}`} icon={<CrownOutlined />} style={{ marginTop: 16 }} />
            <Button type="primary" size="large" block style={{ marginTop: 24 }} onClick={() => navigate(`/team/${taskId}/solution`)}>
              Продолжить к решению
            </Button>
          </>
        ) : (
          <div>
            {votingActive && timeLeft !== null && timeLeft > 0 && (
              <div style={{ marginBottom: 24, textAlign: 'center' }}>
                <Text type="secondary">Осталось времени для голосования:</Text>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#2dd4bf' }}>
                  {formatTimeLeft(timeLeft)}
                </div>
              </div>
            )}
            
            <Alert 
              type="info" 
              message="Голосование за капитана" 
              description={votingActive ? "Выберите кандидата, за которого хотите проголосовать" : "Голосование ещё не запущено. Ожидайте."}
              style={{ marginBottom: 16 }} 
            />
            
            {votingActive && (
              <List
                dataSource={members}
                renderItem={(member) => (
                  <List.Item
                    style={{
                      cursor: 'pointer',
                      borderRadius: 8,
                      background: votedFor === member.userId ? '#e6f7ff' : 'transparent',
                      padding: '12px 16px',
                    }}
                    onClick={() => handleVote(member.userId)}
                  >
                    <List.Item.Meta
                      avatar={<UserOutlined />}
                      title={member.credentials}
                    />
                    {votedFor === member.userId ? (
                      <Tag color="green" icon={<CheckOutlined />}>Вы проголосовали</Tag>
                    ) : (
                      <Button type="link">Голосовать</Button>
                    )}
                  </List.Item>
                )}
              />
            )}
            
            {votedFor && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Text type="secondary">Вы уже проголосовали. Ожидайте результатов.</Text>
              </div>
            )}
            
            {!votingActive && isTeacher && (
              <Button
                type="primary"
                size="large"
                block
                onClick={handleStartVoting}
                loading={saving}
                disabled={members.length < 2}
                icon={<ClockCircleOutlined />}
                style={{ marginTop: 16 }}
              >
                🗳️ Запустить голосование (на {formatDurationText(votingDurationMinutes)})
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}