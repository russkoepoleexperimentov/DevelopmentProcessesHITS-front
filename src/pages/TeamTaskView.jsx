import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Tag, Descriptions, Button, Spin, message, Divider, Space } from 'antd';
import { ArrowLeftOutlined, TeamOutlined, FileOutlined, ClockCircleOutlined, EditOutlined } from '@ant-design/icons';
import { postAPI, filesAPI } from '../shared/api/endpoints';
import { useAuth } from '../shared/lib/authContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function TeamTaskView() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    loadTask();
    checkUserRole();
  }, [taskId]);

  const checkUserRole = async () => {
    try {
      const courseId = localStorage.getItem('currentCourseId');
      if (courseId) {
        const { courseAPI } = await import('../shared/api/endpoints');
        const courseData = await courseAPI.getById(courseId);
        setIsTeacher(courseData.role === 'teacher');
      }
    } catch (error) {
      console.error('Ошибка получения роли:', error);
    }
  };

  const loadTask = async () => {
    setLoading(true);
    try {
      const data = await postAPI.getById(taskId);
      setTask(data);
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

  if (!task) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Text type="secondary">Задание не найдено</Text>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ fontSize: 15 }}
        >
          Назад
        </Button>
        {isTeacher && (
          <Button
            type="default"
            icon={<EditOutlined />}
            onClick={() => navigate(`/post/${taskId}/edit`)}
          >
            Редактировать
          </Button>
        )}
      </div>

      <Card style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Tag color="purple" style={{ fontSize: 14, padding: '4px 12px' }}>
              <TeamOutlined /> Групповое задание
            </Tag>
            <Title level={2} style={{ marginTop: 12, marginBottom: 0 }}>
              {task.title}
            </Title>
          </div>
          <Button
            type="primary"
            icon={<TeamOutlined />}
            onClick={() => navigate(`/team/${taskId}/select`)}
            size="large"
          >
            Перейти к командам
          </Button>
        </div>

        <Divider />

        {/* Описание */}
        {task.text && (
          <div style={{ marginBottom: 24 }}>
            <Text strong style={{ fontSize: 16 }}>Описание</Text>
            <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
              <Text>{task.text}</Text>
            </div>
          </div>
        )}

        {/* Детали задания */}
        <Descriptions column={1} bordered size="small" style={{ marginBottom: 24 }}>
          {task.deadline && (
            <Descriptions.Item label={
              <span><ClockCircleOutlined style={{ marginRight: 8 }} />Дедлайн</span>
            }>
              {dayjs(task.deadline).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
          )}
          {task.maxScore !== undefined && task.maxScore !== null && (
            <Descriptions.Item label="Максимальный балл">
              <Tag color="blue">{task.maxScore} баллов</Tag>
            </Descriptions.Item>
          )}
          {task.minTeamSize && (
            <Descriptions.Item label="Размер команды">
              от {task.minTeamSize} до {task.maxTeamSize} человек
            </Descriptions.Item>
          )}
          {task.captainMode && (
            <Descriptions.Item label="Выбор капитана">
              {task.captainMode === 'firstMember' && 'Первый вступивший'}
              {task.captainMode === 'teacherFixed' && 'Назначает учитель'}
              {task.captainMode === 'votingAndLottery' && 'Голосование'}
            </Descriptions.Item>
          )}
          {task.votingDurationHours && task.captainMode === 'votingAndLottery' && (
            <Descriptions.Item label="Длительность голосования">
              {task.votingDurationHours} часов
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Самостоятельное вступление">
            <Tag color={task.allowJoinTeam ? 'green' : 'red'}>
              {task.allowJoinTeam ? 'Разрешено' : 'Запрещено'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Самостоятельный выход">
            <Tag color={task.allowLeaveTeam ? 'green' : 'red'}>
              {task.allowLeaveTeam ? 'Разрешён' : 'Запрещён'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>

        {/* Файлы */}
        {task.files && task.files.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <Text strong style={{ fontSize: 16 }}>Прикреплённые файлы</Text>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {task.files.map((file) => (
                <a
                  key={file.id}
                  href={filesAPI.getUrl(file.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Tag icon={<FileOutlined />} color="blue" style={{ cursor: 'pointer' }}>
                    {file.name}
                  </Tag>
                </a>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}