import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  Radio,
  Space,
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
import { UserOutlined, CrownOutlined, TeamOutlined, CheckOutlined } from '@ant-design/icons';
import { teamTaskAPI, teamAPI } from '../shared/api/endpoints';

const { Title, Text } = Typography;

export default function TeamLeader() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectionType, setSelectionType] = useState('auto');
  const [selectedLeader, setSelectedLeader] = useState(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [votingActive, setVotingActive] = useState(false);

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
      
      const captainStatus = await teamAPI.isCaptain(teamData.id);
      setIsCaptain(captainStatus);
      
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartVoting = async () => {
    setSaving(true);
    try {
      await teamAPI.startVoting(team.id);
      setVotingActive(true);
      message.success('Голосование запущено');
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (candidateId) => {
    setSaving(true);
    try {
      await teamAPI.vote(team.id, candidateId);
      message.success('Голос учтён');
      loadData();
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTransferCaptain = async () => {
    if (!selectedLeader) {
      message.warning('Выберите нового капитана');
      return;
    }
    setSaving(true);
    try {
      await teamAPI.transferCaptain(team.id, selectedLeader);
      message.success('Капитан назначен');
      loadData();
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = () => {
    navigate(`/team/${taskId}/solution`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Card style={{ borderRadius: 12 }}>
        <Title level={3}>Выбор лидера команды</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          Определите, кто будет руководить командой
        </Text>

        {isCaptain && (
          <Alert
            message="Вы - капитан команды"
            description="Вы можете назначить нового капитана или запустить голосование."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Statistic title="Команда" value={team?.name || 'Без названия'} prefix={<TeamOutlined />} />
          </Col>
          <Col span={12}>
            <Statistic title="Участников" value={members.length} prefix={<UserOutlined />} />
          </Col>
        </Row>

        <Divider />

        <div style={{ marginBottom: 24 }}>
          <Text strong>Способ выбора лидера</Text>
          <Radio.Group
            value={selectionType}
            onChange={(e) => setSelectionType(e.target.value)}
            style={{ marginTop: 8, display: 'block' }}
          >
            <Space direction="vertical">
              <Radio value="auto">🤖 Автоматически (первый участник)</Radio>
              <Radio value="manual">✋ Ручной выбор</Radio>
              <Radio value="vote">🗳️ Голосование</Radio>
            </Space>
          </Radio.Group>
        </div>

        {selectionType === 'manual' && (
          <div style={{ marginBottom: 24 }}>
            <Text strong>Выберите лидера</Text>
            <List
              style={{ marginTop: 8 }}
              dataSource={members}
              renderItem={(member) => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    background: selectedLeader === member.userId ? '#e6f7ff' : 'transparent',
                    borderRadius: 8,
                  }}
                  onClick={() => setSelectedLeader(member.userId)}
                >
                  <List.Item.Meta
                    avatar={<UserOutlined />}
                    title={member.credentials}
                    description={member.userId === team?.captainId ? <Tag color="gold">Капитан</Tag> : null}
                  />
                  {selectedLeader === member.userId && <CheckOutlined style={{ color: '#52c41a' }} />}
                </List.Item>
              )}
            />
            <Button
              type="primary"
              style={{ marginTop: 16 }}
              onClick={handleTransferCaptain}
              loading={saving}
              disabled={!selectedLeader}
            >
              Назначить лидера
            </Button>
          </div>
        )}

        {selectionType === 'vote' && (
          <div style={{ marginBottom: 24 }}>
            <Text strong>Голосование</Text>
            {!votingActive ? (
              <Button
                type="primary"
                style={{ marginTop: 16 }}
                onClick={handleStartVoting}
                loading={saving}
              >
                Запустить голосование
              </Button>
            ) : (
              <List
                style={{ marginTop: 8 }}
                dataSource={members}
                renderItem={(member) => (
                  <List.Item
                    style={{ cursor: 'pointer', borderRadius: 8 }}
                    onClick={() => handleVote(member.userId)}
                  >
                    <List.Item.Meta
                      avatar={<UserOutlined />}
                      title={member.credentials}
                    />
                    <Button type="link">Голосовать</Button>
                  </List.Item>
                )}
              />
            )}
          </div>
        )}

        {selectionType === 'auto' && (
          <Alert
            message="Автоматический выбор"
            description="Лидером будет назначен первый участник команды."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Divider />

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button type="primary" onClick={handleContinue}>
            Продолжить к решению
          </Button>
        </div>
      </Card>
    </div>
  );
}