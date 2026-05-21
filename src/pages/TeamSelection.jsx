import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, List, message, Spin, Typography, Alert, Tag, Space, Select, Modal, Input } from 'antd';
import { UserAddOutlined, TeamOutlined, CheckCircleOutlined, PlusOutlined, DeleteOutlined, ClockCircleOutlined, ReloadOutlined, CrownOutlined } from '@ant-design/icons';
import { teamTaskAPI, teamAPI, courseAPI, postAPI } from '../shared/api/endpoints';

const { Title, Text } = Typography;
const normalizeCaptainMode = (mode) => mode === 'votingAndLottery' ? 'votingAndLottery' : 'firstMember';

export default function TeamSelection() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [courseStudents, setCourseStudents] = useState([]);
  const [allowJoinTeam, setAllowJoinTeam] = useState(true);
  const [allowLeaveTeam, setAllowLeaveTeam] = useState(true);
  const [captainMode, setCaptainMode] = useState('firstMember');
  const [votingActive, setVotingActive] = useState(false);
  const [votingDurationHours, setVotingDurationHours] = useState(24);
  const [checkingVoting, setCheckingVoting] = useState(false);
  const [maxTeamSize, setMaxTeamSize] = useState(null);
  const [createTeamModalOpen, setCreateTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  useEffect(() => {
    const init = async () => {
      const teacherStatus = await checkPermissions();
      await loadTaskSettings();
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

  const loadTaskSettings = async () => {
    try {
      const taskData = await postAPI.getById(taskId);
      setCaptainMode(normalizeCaptainMode(taskData.captainMode));
      setVotingDurationHours(taskData.votingDurationHours || 24);
      setAllowJoinTeam(taskData.allowJoinTeam ?? true);
      setAllowLeaveTeam(taskData.allowLeaveTeam ?? true);
      setMaxTeamSize(taskData.maxTeamSize ?? null);
    } catch (error) {
      console.log('Не удалось получить настройки задания');
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
          setMaxTeamSize(taskData.maxTeamSize ?? null);
        }
      } catch (error) {
        console.log('Не удалось получить настройки задания');
      }
      
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

  const checkVotingStatusFromAPI = async () => {
    setCheckingVoting(true);
    try {
      const teamData = await teamTaskAPI.getMyTeam(taskId);
      
      if (teamData.captainId) {
        message.info('Капитан уже выбран');
        setVotingActive(false);
        return;
      }
      
      setVotingActive(true);
      message.success('Голосование активно! Обновите страницу.');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Ошибка проверки статуса:', error);
      message.error('Не удалось проверить статус голосования');
    } finally {
      setCheckingVoting(false);
    }
  };

  const handleStartVoting = async (teamToStart = null) => {
    if (!isTeacher) {
      message.warning('Только учитель может запустить голосование');
      return;
    }
    
    const targetTeam = teamToStart || teams.find(team => (team.members?.length || 0) >= 2 && !team.captainId) || teams[0];
    if (!targetTeam) {
      message.warning('Нет созданных команд');
      return;
    }
    
    if (targetTeam.members?.length < 2) {
      message.warning('Для запуска голосования необходимо минимум 2 участника в команде');
      return;
    }
    
    setSaving(true);
    try {
      await teamAPI.startVoting(targetTeam.id);
      setVotingActive(true);
      message.success(`Голосование запущено! Длительность: ${votingDurationHours} часов`);
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignCaptain = async (teamId, userId) => {
    setSaving(true);
    try {
      await teamAPI.setFixedCaptain(teamId, userId);
      message.success('Капитан назначен');
      const teacherStatus = isTeacher;
      await loadData(teacherStatus);
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
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
    } catch (error) {
      message.error(error.message);
    } finally {
      setJoining(false);
    }
  };

  const openCreateTeamModal = () => {
    setNewTeamName(`Команда ${teams.length + 1}`);
    setCreateTeamModalOpen(true);
  };

  const createTeam = async () => {
    if (!allowJoinTeam) {
      message.error('Учитель запретил самостоятельное вступление в команды');
      return;
    }

    const name = newTeamName.trim() || `Команда ${teams.length + 1}`;
    setCreatingTeam(true);
    try {
      await teamTaskAPI.createTeam(taskId, name);
      message.success('Команда создана, вы добавлены в неё');
      setCreateTeamModalOpen(false);
      setNewTeamName('');
      await loadData(isTeacher);
    } catch (error) {
      message.error(error.message);
    } finally {
      setCreatingTeam(false);
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

  const getAvailableStudentsForTeam = (team) => {
    const memberIds = team.members?.map(m => getMemberId(m)) || [];
    return courseStudents.filter(s => 
      s.role === 'student' && !memberIds.some(id => idsEqual(id, s.id))
    );
  };

  const getMemberId = (member) => member?.userId || member?.id || member?.studentId;
  const getMemberName = (member) => member?.credentials || member?.name || member?.fullName || 'Участник';
  const idsEqual = (left, right) => left != null && right != null && String(left) === String(right);
  const getMembersCount = (team) => team?.members?.length || 0;
  const isTeamFull = (team) => maxTeamSize && getMembersCount(team) >= maxTeamSize;
  const getCaptainMember = (team) => {
    const teamMembers = team?.members || [];
    const captainId = team?.captainId || team?.leaderId || team?.captain?.id || team?.leader?.id;
    const apiCaptain = teamMembers.find(member => idsEqual(getMemberId(member), captainId));
    const roleCaptain = teamMembers.find(member => member.role === 'leader' || member.role === 'captain');
    const firstMemberCaptain = captainMode === 'firstMember' ? teamMembers[0] : null;
    return apiCaptain || roleCaptain || firstMemberCaptain || null;
  };
  const isMemberCaptain = (team, member) => {
    const captain = getCaptainMember(team);
    return idsEqual(getMemberId(member), getMemberId(captain));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const createTeamDialog = (
    <Modal
      title="Создать команду"
      open={createTeamModalOpen}
      onOk={createTeam}
      onCancel={() => setCreateTeamModalOpen(false)}
      okText="Создать"
      cancelText="Отмена"
      confirmLoading={creatingTeam}
      okButtonProps={{ disabled: !newTeamName.trim() }}
    >
      <Input
        value={newTeamName}
        onChange={(event) => setNewTeamName(event.target.value)}
        placeholder="Название команды"
        maxLength={80}
      />
    </Modal>
  );

  // Студент уже в команде, но голосование ещё не активно
  if (myTeam && !isTeacher && captainMode === 'votingAndLottery' && !votingActive) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            <Title level={3} style={{ marginTop: 16 }}>Вы в команде</Title>
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

          <Alert
            type="info"
            message="Ожидание начала голосования"
            description="Учитель запустит голосование для выбора капитана."
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Space style={{ width: '100%', justifyContent: 'center' }} direction="vertical">
            <Button 
              type="primary"
              icon={<ReloadOutlined />}
              onClick={checkVotingStatusFromAPI}
              loading={checkingVoting}
              style={{ width: '100%' }}
            >
              Проверить статус голосования
            </Button>
            <Button 
              type="default"
              onClick={() => navigate(`/team/${taskId}/leader`)}
              style={{ width: '100%' }}
            >
              Перейти к голосованию (принудительно)
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

  // Студент уже в команде и голосование активно
  if (myTeam && !isTeacher && captainMode === 'votingAndLottery' && votingActive) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            <Title level={3} style={{ marginTop: 16 }}>Вы в команде</Title>
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
              Перейти к голосованию
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

  // Студент уже в команде (другие режимы)
  if (myTeam && !isTeacher) {
    const targetPath = `/team/${taskId}/leader`;
    
    const buttonText = captainMode === 'teacherFixed'
      ? 'Проверить назначение капитана'
      : captainMode === 'firstMember'
        ? 'Перейти к командному решению'
        : 'Перейти к выбору капитана';
    
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
                <Tag key={getMemberId(member)} icon={<TeamOutlined />} color="blue">
                  {getMemberName(member)}
                  {isMemberCaptain(myTeam, member) && <CrownOutlined style={{ marginLeft: 4 }} />}
                </Tag>
              ))}
            </div>
          </div>

          <Space style={{ width: '100%', justifyContent: 'center' }}>
            <Button onClick={() => navigate(targetPath)} type="primary">
              {buttonText}
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

          {captainMode === 'votingAndLottery' && !votingActive && (
            <Button
              type="primary"
              icon={<ClockCircleOutlined />}
              onClick={() => handleStartVoting()}
              loading={saving}
              style={{ marginBottom: 16 }}
              size="large"
              block
            >
              🗳️ Запустить голосование (на {votingDurationHours === 1 ? '1 минуту' : 
                votingDurationHours < 60 ? `${votingDurationHours} минут` : 
                votingDurationHours === 24 ? '24 часа' : `${votingDurationHours} часов`})
            </Button>
          )}

          {votingActive && (
            <Alert
              message="Голосование активно!"
              description="Голосование за капитана запущено. Участники могут голосовать."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {teams.length === 0 ? (
            <Alert
              message="Нет созданных команд"
              description="Сначала создайте команды в настройках задания."
              type="warning"
              showIcon
            />
          ) : (
            teams.map((team) => {
              const availableStudents = getAvailableStudentsForTeam(team);
              const currentCaptain = getCaptainMember(team);
              const hasCaptain = !!currentCaptain;
              
              return (
                <Card key={team.id} size="small" style={{ marginBottom: 16 }}>
                  <Title level={5}>Команда: {team.name || `#${team.id.slice(0, 8)}`}</Title>
                  
                  {hasCaptain && (
                    <div style={{ marginBottom: 12 }}>
                      <Tag color="gold" icon={<CrownOutlined />}>
                        Капитан: {currentCaptain.credentials}
                      </Tag>
                    </div>
                  )}
                  
                  {captainMode === 'teacherFixed' && !hasCaptain && team.members?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <Text strong>Назначить капитана:</Text>
                      <Select
                        placeholder="Выберите капитана"
                        style={{ width: '100%', marginTop: 8 }}
                        options={team.members.map(m => ({ label: getMemberName(m), value: getMemberId(m) }))}
                        onSelect={(userId) => handleAssignCaptain(team.id, userId)}
                        loading={saving}
                      />
                    </div>
                  )}

                  {captainMode === 'votingAndLottery' && !hasCaptain && (
                    <Button
                      type="primary"
                      icon={<ClockCircleOutlined />}
                      onClick={() => handleStartVoting(team)}
                      loading={saving}
                      disabled={(team.members?.length || 0) < 2}
                      style={{ marginBottom: 12 }}
                    >
                      Запустить голосование для команды
                    </Button>
                  )}
                  
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>Участники ({team.members?.length || 0}):</Text>
                    <div style={{ marginTop: 8 }}>
                      {team.members?.map((member) => (
                        <Tag
                          key={getMemberId(member)}
                          closable
                          onClose={() => removeStudentFromTeam(team.id, getMemberId(member), getMemberName(member))}
                          icon={<TeamOutlined />}
                          color="blue"
                        >
                          {getMemberName(member)}
                          {isMemberCaptain(team, member) && <CrownOutlined style={{ marginLeft: 4 }} />}
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
                      {availableStudents.length > 0 ? (
                        availableStudents.map((student) => (
                          <Button
                            key={student.id}
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => addStudentToTeam(team.id, student.id, student.credentials)}
                          >
                            {student.credentials}
                          </Button>
                        ))
                      ) : (
                        <Text type="secondary">Нет доступных студентов</Text>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}

          <Button style={{ marginTop: 16 }} onClick={() => navigate(-1)}>
            Назад
          </Button>
        </Card>
        {createTeamDialog}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <Alert
            message="Нет доступных команд"
            description={
              allowJoinTeam
                ? 'Пока нет созданных команд. Вы можете создать первую команду для этого задания.'
                : 'Пока нет созданных команд. Самостоятельное создание и вступление запрещены преподавателем.'
            }
            type={allowJoinTeam ? 'info' : 'warning'}
            showIcon
          />
          <Space style={{ marginTop: 16 }}>
            {allowJoinTeam && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTeamModal}>
                Создать команду
              </Button>
            )}
            <Button onClick={() => navigate(-1)}>
              Назад
            </Button>
          </Space>
        </Card>
        {createTeamDialog}
      </div>
    );
  }

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

        {allowJoinTeam && (
          <Button
            type="primary"
            ghost
            icon={<PlusOutlined />}
            onClick={openCreateTeamModal}
            style={{ marginBottom: 16 }}
          >
            Создать свою команду
          </Button>
        )}

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
                  disabled={isTeamFull(team)}
                >
                  {isTeamFull(team) ? 'Команда заполнена' : 'Вступить'}
                </Button>,
              ] : []}
            >
              <List.Item.Meta
                avatar={<TeamOutlined style={{ fontSize: 24, color: '#1967d2' }} />}
                title={`Команда ${team.name || `#${team.id.slice(0, 8)}`}`}
                description={`Участников: ${getMembersCount(team)}${maxTeamSize ? ` из ${maxTeamSize}` : ''}`}
              />
            </List.Item>
          )}
        />
        {createTeamDialog}
      </Card>
    </div>
  );
}
