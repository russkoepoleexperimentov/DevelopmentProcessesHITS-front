// src/components/GradeDistributionForm.jsx
import React, { useState, useEffect } from 'react';
import { Card, Table, InputNumber, Button, message, Space, Typography, Alert, Tag } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const GradeDistributionForm = ({
  teamId,
  assignmentId,
  teamRawScore,
  members,
  initialDistribution,
  onSave,
  readOnly = false,
  isCaptain = false
}) => {
  const [distribution, setDistribution] = useState({});
  const [totalDistributed, setTotalDistributed] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialDistribution && initialDistribution.length > 0) {
      const dist = {};
      initialDistribution.forEach(d => {
        dist[d.userId] = d.points;
      });
      setDistribution(dist);
    } else if (members && members.length > 0) {
      const initial = {};
      members.forEach(m => {
        initial[m.userId] = 0;
      });
      setDistribution(initial);
    }
  }, [initialDistribution, members]);

  useEffect(() => {
    const total = Object.values(distribution).reduce((sum, val) => sum + (val || 0), 0);
    setTotalDistributed(total);
  }, [distribution]);

  const handleChange = (userId, value) => {
    if (readOnly) return;
    setDistribution(prev => ({ ...prev, [userId]: value }));
  };

  const handleSave = async () => {
    if (Math.abs(totalDistributed - teamRawScore) > 0.01) {
      message.error(`Сумма распределённых баллов (${totalDistributed}) должна равняться ${teamRawScore}`);
      return;
    }

    setSaving(true);
    const entries = Object.entries(distribution).map(([userId, points]) => ({
      userId,
      points: parseFloat(points) || 0
    }));

    try {
      await onSave(teamId, assignmentId, entries);
      message.success('Распределение баллов сохранено');
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Участник',
      dataIndex: 'credentials',
      key: 'credentials',
      render: (text, record) => (
        <Space>
          {text}
          {record.role === 'leader' && <Tag color="gold">Капитан</Tag>}
        </Space>
      ),
    },
    {
      title: 'Баллы',
      dataIndex: 'userId',
      key: 'points',
      render: (userId, record) => (
        <InputNumber
          min={0}
          max={teamRawScore}
          step={0.5}
          value={distribution[userId] || 0}
          onChange={(val) => handleChange(userId, val)}
          disabled={readOnly || !isCaptain}
          style={{ width: 100 }}
          precision={1}
        />
      ),
    },
  ];

  if (!members || members.length === 0) {
    return (
      <Card>
        <Text type="secondary">Нет участников в команде</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Title level={5}>Распределение баллов команды</Title>
      <Text type="secondary">Общий балл команды: <strong>{teamRawScore}</strong></Text>
      
      {!isCaptain && !readOnly && (
        <Alert
          message="Только капитан может распределять баллы"
          type="info"
          showIcon
          style={{ margin: '12px 0' }}
        />
      )}
      
      <Table
        dataSource={members}
        columns={columns}
        rowKey="userId"
        pagination={false}
        size="small"
        style={{ marginTop: 12 }}
      />
      
      <div style={{ marginTop: 16 }}>
        <Text strong>Распределено: {totalDistributed.toFixed(1)}</Text>
        {Math.abs(totalDistributed - teamRawScore) > 0.01 && (
          <Text type="danger" style={{ display: 'block', marginTop: 4 }}>
            ⚠️ Сумма должна равняться {teamRawScore}
          </Text>
        )}
        {Math.abs(totalDistributed - teamRawScore) <= 0.01 && (
          <Text type="success" style={{ display: 'block', marginTop: 4 }}>
            ✓ Сумма совпадает с общим баллом команды
          </Text>
        )}
      </div>
      
      {isCaptain && !readOnly && (
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          style={{ marginTop: 16 }}
          block
        >
          Сохранить распределение
        </Button>
      )}
    </Card>
  );
};

export default GradeDistributionForm;