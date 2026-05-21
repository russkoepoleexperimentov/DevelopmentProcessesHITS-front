// src/components/TeamSelfAssessmentList.jsx
import React, { useState, useEffect } from 'react';
import { Card, Collapse, Tag, Button, message, Space, Spin } from 'antd';
import { UserOutlined, CheckOutlined, EditOutlined } from '@ant-design/icons';
import SelfAssessmentForm from './SelfAssessmentForm';

const { Panel } = Collapse;

const TeamSelfAssessmentList = ({
  assignmentConfig,  // ← это пропс, его нужно передавать из родителя
  taskId,
  teamMembers,
  existingSelfAssessments,
  onSubmitSelfAssessment,
  readOnly = false
}) => {
  const [selfAssessments, setSelfAssessments] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [activeKeys, setActiveKeys] = useState([]);

  useEffect(() => {
    if (existingSelfAssessments && existingSelfAssessments.length > 0) {
      const assessments = {};
      existingSelfAssessments.forEach(sa => {
        assessments[sa.userId] = sa.evaluation;
      });
      setSelfAssessments(assessments);
      
      // Автоматически открываем панели с незаполненными самооценками
      const notFilled = teamMembers
        .filter(m => !assessments[m.userId])
        .map(m => m.userId);
      setActiveKeys(notFilled);
    }
  }, [existingSelfAssessments, teamMembers]);

  const handleSave = async (userId, evaluation) => {
    if (readOnly) return;
    
    setSubmitting(prev => ({ ...prev, [userId]: true }));
    try {
      await onSubmitSelfAssessment(taskId, userId, evaluation);
      setSelfAssessments(prev => ({ ...prev, [userId]: evaluation }));
      message.success('Самооценка сохранена');
    } catch (error) {
      message.error(error.message);
    } finally {
      setSubmitting(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (!assignmentConfig) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
          <p style={{ marginTop: 12, color: '#999' }}>Загрузка критериев...</p>
        </div>
      </Card>
    );
  }

  if (!teamMembers || teamMembers.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <UserOutlined style={{ fontSize: 48, color: '#ccc' }} />
          <p style={{ marginTop: 12, color: '#999' }}>Нет участников в команде</p>
        </div>
      </Card>
    );
  }

  return (
    <Collapse activeKey={activeKeys} onChange={setActiveKeys}>
      {teamMembers.map(member => {
        const hasAssessment = !!selfAssessments[member.userId];
        const isSubmitting = submitting[member.userId];
        
        return (
          <Panel
            key={member.userId}
            header={
              <Space>
                <UserOutlined />
                {member.credentials}
                <Tag color={member.role === 'leader' ? 'gold' : 'default'}>
                  {member.role === 'leader' ? 'Капитан' : 'Участник'}
                </Tag>
                {hasAssessment && (
                  <Tag color="green" icon={<CheckOutlined />}>Заполнено</Tag>
                )}
                {!hasAssessment && !readOnly && (
                  <Tag color="orange" icon={<EditOutlined />}>Не заполнено</Tag>
                )}
              </Space>
            }
          >
            {isSubmitting ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Spin tip="Сохранение..." />
              </div>
            ) : (
              <SelfAssessmentForm
                assignmentConfig={assignmentConfig}
                initialAssessment={selfAssessments[member.userId]}
                onChange={(evaluation) => handleSave(member.userId, evaluation)}
                readOnly={readOnly}
              />
            )}
          </Panel>
        );
      })}
    </Collapse>
  );
};

export default TeamSelfAssessmentList;