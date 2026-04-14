import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  message,
  Spin,
  Alert,
  Divider,
  Statistic,
  Row,
  Col,
  Tag,
} from 'antd';
import { CrownOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { teamTaskAPI, teamAPI, postAPI } from '../shared/api/endpoints';

const { Title, Text } = Typography;

export default function TeamLeader() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [isCaptain, setIsCaptain] = useState(false);
  const [captainName, setCaptainName] = useState('');

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
      
      const captain = memberList.find(m => m.role === 'leader');
      if (captain) {
        setCaptainName(captain.credentials);
      } else if (captainStatus && memberList.length > 0) {
        const currentUser = memberList.find(m => m.userId === captainStatus);
        if (currentUser) {
          setCaptainName(currentUser.credentials);
        }
      }
      
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const hasCaptain = members.some(m => m.role === 'leader') || isCaptain;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Card style={{ borderRadius: 12 }}>
        <Title level={3}>Выбор лидера команды</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          Первый вступивший в команду становится капитаном
        </Text>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Statistic title="Команда" value={team?.name || 'Без названия'} prefix={<TeamOutlined />} />
          </Col>
          <Col span={12}>
            <Statistic title="Участников" value={members.length} prefix={<UserOutlined />} />
          </Col>
        </Row>

        {hasCaptain ? (
          <>
            <Alert
              title="Капитан определён"
              description={`Капитан команды: ${captainName || (isCaptain ? 'Вы' : 'Назначен')}`}
              type="success"
              showIcon
              icon={<CrownOutlined />}
              style={{ marginBottom: 24 }}
            />
            <Button
              type="primary"
              size="large"
              block
              onClick={() => navigate(`/team/${taskId}/distribution`)}
            >
              Продолжить к распределению
            </Button>
          </>
        ) : (
          <Alert
            title="Ожидание капитана"
            description="Первый вступивший в команду станет капитаном."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Divider />

        <div style={{ marginTop: 16 }}>
          <Text strong>Участники команды:</Text>
          <div style={{ marginTop: 8 }}>
            {members.map((member) => (
              <Tag key={member.userId} icon={<UserOutlined />} color="blue">
                {member.credentials}
                {member.role === 'leader' && <CrownOutlined style={{ marginLeft: 8, color: '#faad14' }} />}
              </Tag>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}