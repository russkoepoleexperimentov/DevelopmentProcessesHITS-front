import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, List, message, Spin, Typography, Alert, Tag, Space } from 'antd';
import { UserAddOutlined, TeamOutlined, CheckCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { teamTaskAPI, teamAPI, courseAPI } from '../shared/api/endpoints';

const { Title, Text } = Typography;

export default function TeamSelection() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [courseStudents, setCourseStudents] = useState([]);
  const [allowJoinTeam, setAllowJoinTeam] = useState(true);
  const [allowLeaveTeam, setAllowLeaveTeam] = useState(true);

  useEffect(() => {
    const init = async () => {
      const teacherStatus = await checkPermissions();
      await loadData(teacherStatus);
    };
    init();
  }, [taskId]);

  const checkPermissions = async () => {
    try {
      const courseId = localStorage.getItem('currentCourseId');
      if (courseId) {
        const courseData = await courseAPI.getById(courseId);
        const isTeacherRole = courseData.role === 'teacher';
        setIsTeacher(isTeacherRole);
        
        if (isTeacherRole) {
          const members = await courseAPI.getMembers(courseId, 0, 100);
          setCourseStudents(members.records || []);
        }
        return isTeacherRole;
      }
      return false;
    } catch (error) {
      console.error('Ошибка получения прав:', error);
      return false;
    }
  };

  const loadData = async (teacherStatus) => {
    setLoading(true);
    try {
      const teamsData = await teamTaskAPI.getTeams(taskId);
      setTeams(teamsData || []);
      
      try {
        const taskData = await teamTaskAPI.getTaskDetails?.(taskId);
        if (taskData) {
          setAllowJoinTeam(taskData.allowJoinTeam ?? true);
          setAllowLeaveTeam(taskData.allowLeaveTeam ?? true);
        }
      } catch (error) {
        console.log('Не удалось получить настройки задания');
      }
      
      // Только для студентов — проверяем, в команде ли он
      if (!teacherStatus) {
        try {
          const myTeamData = await teamTaskAPI.getMyTeam(taskId);
          setMyTeam(myTeamData);
        } catch (error) {
          setMyTeam(null);
        }
      } else {
        setMyTeam(null);
      }
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const joinTeam = async (teamId) => {
    if (!allowJoinTeam) {
      message.error('Учитель запретил самостоятельное вступление в команды');
      return;
    }
    
    setJoining(true);
    try {
      await teamAPI.join(teamId);
      message.success('Вы вступили в команду!');
      const teacherStatus = isTeacher;
      await loadData(teacherStatus);
      navigate(`/team/${taskId}/leader`);
    } catch (error) {
      message.error(error.message);
    } finally {
      setJoining(false);
    }
  };

  const leaveTeam = async () => {
    if (!myTeam) return;
    if (!allowLeaveTeam) {
      message.error('Учитель запретил самостоятельный выход из команд');
      return;
    }
    
    setJoining(true);
    try {
      await teamAPI.leave(myTeam.id);
      message.success('Вы покинули команду');
      const teacherStatus = isTeacher;
      await loadData(teacherStatus);
    } catch (error) {
      message.error(error.message);
    } finally {
      setJoining(false);
    }
  };

  const addStudentToTeam = async (teamId, studentId, studentName) => {
    setJoining(true);
    try {
      await teamAPI.addStudent(teamId, studentId);
      message.success(`Студент ${studentName} добавлен в команду`);
      const teacherStatus = isTeacher;
      await loadData(teacherStatus);
    } catch (error) {
      message.error(error.message);
    } finally {
      setJoining(false);
    }
  };

  const removeStudentFromTeam = async (teamId, studentId, studentName) => {
    setJoining(true);
    try {
      await teamAPI.removeStudent(teamId, studentId);
      message.success(`Студент ${studentName} удалён из команды`);
      const teacherStatus = isTeacher;
      await loadData(teacherStatus);
    } catch (error) {
      message.error(error.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Если пользователь уже в команде (студент)
  if (myTeam && !isTeacher) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            <Title level={3} style={{ marginTop: 16 }}>Вы уже в команде</Title>
            <Text type="secondary">
              Вы вступили в команду "{myTeam.name || 'Без названия'}"
            </Text>
          </div>
          
          <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 24 }}>
            <Text strong>Участники команды:</Text>
            <div style={{ marginTop: 8 }}>
              {myTeam.members?.map((member) => (
                <Tag key={member.userId} icon={<TeamOutlined />} color="blue">
                  {member.credentials}
                </Tag>
              ))}
            </div>
          </div>

          <Space style={{ width: '100%', justifyContent: 'center' }}>
            <Button onClick={() => navigate(`/team/${taskId}/leader`)} type="primary">
              Перейти к выбору капитана
            </Button>
            {allowLeaveTeam && (
              <Button danger onClick={leaveTeam} loading={joining}>
                Покинуть команду
              </Button>
            )}
          </Space>
        </Card>
      </div>
    );
  }

  // Для учителя - управление командами
  if (isTeacher) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Card>
          <Title level={3}>Управление командами</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Распределите студентов по командам
          </Text>

          <div style={{ marginBottom: 16 }}>
            <Tag color={allowJoinTeam ? 'green' : 'red'}>
              {allowJoinTeam ? '✅ Студенты могут вступать сами' : '❌ Самостоятельное вступление запрещено'}
            </Tag>
            <Tag color={allowLeaveTeam ? 'green' : 'red'} style={{ marginLeft: 8 }}>
              {allowLeaveTeam ? '✅ Студенты могут выходить сами' : '❌ Самостоятельный выход запрещён'}
            </Tag>
          </div>

          {teams.length === 0 ? (
            <Alert
              message="Нет созданных команд"
              description="Сначала создайте команды в настройках задания."
              type="warning"
              showIcon
            />
          ) : (
            teams.map((team) => (
              <Card key={team.id} size="small" style={{ marginBottom: 16 }}>
                <Title level={5}>Команда: {team.name || `#${team.id.slice(0, 8)}`}</Title>
                
                <div style={{ marginBottom: 12 }}>
                  <Text strong>Участники:</Text>
                  <div style={{ marginTop: 8 }}>
                    {team.members?.map((member) => (
                      <Tag
                        key={member.userId}
                        closable
                        onClose={() => removeStudentFromTeam(team.id, member.userId, member.credentials)}
                        icon={<TeamOutlined />}
                        color="blue"
                      >
                        {member.credentials}
                      </Tag>
                    ))}
                    {(!team.members || team.members.length === 0) && (
                      <Text type="secondary">Нет участников</Text>
                    )}
                  </div>
                </div>

                <div>
                  <Text strong>Добавить студента:</Text>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {courseStudents
                      .filter(s => s.role === 'student')
                      .filter(s => !team.members?.some(m => m.userId === s.id))
                      .map((student) => (
                        <Button
                          key={student.id}
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => addStudentToTeam(team.id, student.id, student.credentials)}
                        >
                          {student.credentials}
                        </Button>
                      ))}
                  </div>
                </div>
              </Card>
            ))
          )}

          <Button style={{ marginTop: 16 }} onClick={() => navigate(-1)}>
            Назад
          </Button>
        </Card>
      </div>
    );
  }

  // Если команд нет для студента
  if (teams.length === 0) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <Alert
            message="Нет доступных команд"
            description="Пока нет созданных команд. Обратитесь к преподавателю."
            type="warning"
            showIcon
          />
          <Button style={{ marginTop: 16 }} onClick={() => navigate(-1)}>
            Назад
          </Button>
        </Card>
      </div>
    );
  }

  // Показываем список команд для студента
  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Card>
        <Title level={3}>Выбор команды</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          {allowJoinTeam 
            ? "Выберите команду, в которую хотите вступить"
            : "Самостоятельное вступление в команды запрещено. Обратитесь к преподавателю."
          }
        </Text>

        {!allowJoinTeam && (
          <Alert
            message="Вступление в команды запрещено"
            description="Учитель запретил самостоятельное вступление в команды."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <List
          dataSource={teams}
          renderItem={(team) => (
            <List.Item
              actions={allowJoinTeam ? [
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => joinTeam(team.id)}
                  loading={joining}
                >
                  Вступить
                </Button>,
              ] : []}
            >
              <List.Item.Meta
                avatar={<TeamOutlined style={{ fontSize: 24, color: '#1967d2' }} />}
                title={`Команда ${team.name || `#${team.id.slice(0, 8)}`}`}
                description={`Участников: ${team.members?.length || 0}`}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}