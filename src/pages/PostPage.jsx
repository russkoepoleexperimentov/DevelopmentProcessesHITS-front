// src/pages/PostPage.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Typography,
  Card,
  Tag,
  Button,
  Spin,
  Divider,
  Input,
  message,
  Popconfirm,
  Space,
  Upload,
  Descriptions,
  Collapse,
  Progress,
  Row,
  Col,
  Empty,
  Table,
  Avatar,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  FileOutlined,
  SendOutlined,
  DownloadOutlined,
  MessageOutlined,
  DownOutlined,
  UpOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  CrownOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { postAPI, solutionAPI, commentAPI, filesAPI, teamAPI, teamSolutionAPI, gradeDistributionAPI, courseAPI } from '../shared/api/endpoints';
import { useAuth } from '../shared/lib/authContext';
import { convertBackendToFrontend } from '../shared/utils/convertCriteria';
import dayjs from 'dayjs';
import SelfAssessmentForm from '../components/SelfAssessmentForm';
import GradeDistributionForm from '../components/GradeDistributionForm';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;
const normalizeCaptainMode = (mode) => mode === 'votingAndLottery' ? 'votingAndLottery' : 'firstMember';

// ============================================================
// Компонент комментария (рекурсивный)
// ============================================================
function CommentItem({ comment, onRefreshParent }) {
  const { user } = useAuth();
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [submitting, setSubmitting] = useState(false);

  const loadReplies = async () => {
    try {
      const data = await commentAPI.getReplies(comment.id);
      setReplies(Array.isArray(data) ? data : []);
      setShowReplies(true);
    } catch {
      setReplies([]);
    }
  };

  const toggleReplies = () => {
    if (!showReplies && comment.nestedCount > 0) {
      loadReplies();
    } else {
      setShowReplies(!showReplies);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await commentAPI.reply(comment.id, replyText.trim());
      setReplyText('');
      setReplying(false);
      await loadReplies();
      if (onRefreshParent) onRefreshParent();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editText.trim()) return;
    setSubmitting(true);
    try {
      await commentAPI.update(comment.id, editText.trim());
      comment.text = editText.trim();
      setEditing(false);
      message.success('Комментарий обновлён');
      if (onRefreshParent) onRefreshParent();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await commentAPI.delete(comment.id);
      message.success('Комментарий удалён');
      if (onRefreshParent) onRefreshParent();
    } catch (e) {
      message.error(e.message);
    }
  };

  const isOwn = user && comment.author && user.id === comment.author.id;
  const canEdit = isOwn && !comment.isDeleted;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ background: '#fafafa', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text strong style={{ fontSize: 13 }}>
            {comment.author?.credentials || 'Пользователь'}
          </Text>
          {canEdit && (
            <Space size={4}>
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditing(true); setEditText(comment.text); }} />
              <Popconfirm title="Удалить комментарий?" onConfirm={handleDelete} okText="Да" cancelText="Нет">
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )}
        </div>

        {editing ? (
          <div>
            <TextArea rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} />
            <Space style={{ marginTop: 6 }}>
              <Button type="primary" size="small" loading={submitting} onClick={handleEdit}>Сохранить</Button>
              <Button size="small" onClick={() => setEditing(false)}>Отмена</Button>
            </Space>
          </div>
        ) : (
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{comment.text}</Paragraph>
        )}

        <div style={{ marginTop: 6, display: 'flex', gap: 12 }}>
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setReplying(!replying)}>
            Ответить
          </Button>
          {comment.nestedCount > 0 && (
            <Button type="link" size="small" style={{ padding: 0 }} icon={showReplies ? <UpOutlined /> : <DownOutlined />} onClick={toggleReplies}>
              {showReplies ? 'Скрыть' : `Ответы (${comment.nestedCount})`}
            </Button>
          )}
        </div>
      </div>

      {replying && (
        <div style={{ marginLeft: 24, marginTop: 8 }}>
          <TextArea rows={2} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Ваш ответ..." />
          <Space style={{ marginTop: 6 }}>
            <Button type="primary" size="small" loading={submitting} onClick={handleReply}>Отправить</Button>
            <Button size="small" onClick={() => setReplying(false)}>Отмена</Button>
          </Space>
        </div>
      )}

      {showReplies && replies.length > 0 && (
        <div style={{ marginLeft: 24, marginTop: 8 }}>
          {replies.map((r) => (
            <CommentItem key={r.id} comment={r} onRefreshParent={loadReplies} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Компонент детальной оценки
// ============================================================
function GradeBreakdown({ breakdown, maxScore }) {
  if (!breakdown) return null;

  const percent = maxScore > 0 ? (breakdown.finalScore / maxScore) * 100 : 0;
  const isPassed = !breakdown.thresholdApplied || breakdown.finalScore > 0;

  return (
    <Card size="small" style={{ background: '#f0f7ff', marginBottom: 12 }}>
      <Row align="middle" justify="space-between" style={{ marginBottom: 12 }}>
        <Col>
          <Text strong style={{ fontSize: 16 }}>Детали оценки</Text>
        </Col>
        <Col>
          <Tag color={isPassed ? 'success' : 'error'} icon={isPassed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
            {isPassed ? ' Зачтено' : ' Не зачтено'}
          </Tag>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <div style={{ textAlign: 'center' }}>
            <Progress
              type="circle"
              percent={Math.min(100, Math.max(0, Math.round(percent)))}
              size={100}
              strokeColor={percent >= 60 ? '#52c41a' : percent >= 30 ? '#faad14' : '#ff4d4f'}
              format={() => `${breakdown.finalScore?.toFixed(1)}/${maxScore}`}
            />
          </div>
        </Col>
        <Col span={12}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Базовая оценка">{breakdown.baseScore?.toFixed(1)}</Descriptions.Item>
            {breakdown.latePenalty > 0 && (
              <Descriptions.Item label="Штраф за просрочку">
                <Text type="danger">-{breakdown.latePenalty.toFixed(1)}</Text>
              </Descriptions.Item>
            )}
            {breakdown.afterQualityCoefficient !== breakdown.baseScore && (
              <Descriptions.Item label="Коэффициент качества">{breakdown.afterQualityCoefficient?.toFixed(1)}</Descriptions.Item>
            )}
            {breakdown.afterBlocking !== breakdown.afterLatePenalty && (
              <Descriptions.Item label="Блокировка">{breakdown.afterBlocking?.toFixed(1)}</Descriptions.Item>
            )}
            {breakdown.thresholdApplied && (
              <Descriptions.Item label="Порог">
                <Tag color="orange">{breakdown.thresholdReason || 'Порог применён'}</Tag>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Col>
      </Row>
    </Card>
  );
}

// ============================================================
// Главный компонент PostPage
// ============================================================
export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const [courseRole, setCourseRole] = useState(location.state?.role || null);
  const role = courseRole;
  
  const isStudent = role === 'student';
  const isTeacher = role === 'teacher';
  const getMemberId = (member) => member?.userId || member?.id || member?.studentId;
  const idsEqual = (left, right) => left != null && right != null && String(left) === String(right);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [solution, setSolution] = useState(null);
  const [teamSolution, setTeamSolution] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [solText, setSolText] = useState('');
  const [solFiles, setSolFiles] = useState([]);
  const [solUploading, setSolUploading] = useState(false);
  const [solSubmitting, setSolSubmitting] = useState(false);
  const [selfAssessment, setSelfAssessment] = useState(null);
  const [solutionComments, setSolutionComments] = useState([]);
  const [solCommentText, setSolCommentText] = useState('');
  const [solCommentLoading, setSolCommentLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [gradeDistribution, setGradeDistribution] = useState(null);
  
  const [criteriaConfig, setCriteriaConfig] = useState(null);

  // Проверяем, командное ли задание
  const isTeamTask = useMemo(() => {
    const isTeam = post?.type === 'teaM_TASK' || post?.minTeamSize > 0 || post?.maxTeamSize > 0 || post?.captainMode;
    console.log('🔍 isTeamTask check:', { 
      minTeamSize: post?.minTeamSize, 
      maxTeamSize: post?.maxTeamSize, 
      captainMode: post?.captainMode,
      result: isTeam 
    });
    return isTeam;
  }, [post]);

  const isCaptain = useMemo(() => {
    if (!myTeam || !user) return false;
    const members = myTeam.members || [];
    const member = members.find(m => idsEqual(getMemberId(m), user.id));
    const roleCaptain = member?.role === 'leader' || member?.role === 'captain';
    const firstMemberCaptain =
      normalizeCaptainMode(post?.captainMode) === 'firstMember' &&
      idsEqual(getMemberId(members[0]), user.id);
    return roleCaptain || firstMemberCaptain;
  }, [myTeam, user, post?.captainMode]);

  const fetchPost = useCallback(async () => {
    try {
      const data = await postAPI.getById(id);
      console.log('📦 Post data received:', data);
      setPost(data);
      if (data.criteria && data.criteria.length > 0) {
        const config = convertBackendToFrontend(data.criteria);
        setCriteriaConfig(config);
      }
    } catch (e) {
      message.error(e.message);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (courseRole) return;
    const courseId = localStorage.getItem('currentCourseId');
    if (!courseId) return;

    courseAPI
      .getById(courseId)
      .then((course) => setCourseRole(course.role))
      .catch(() => {});
  }, [courseRole]);

  const fetchComments = useCallback(async () => {
    try {
      const data = await commentAPI.getForPost(id);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    }
  }, [id]);

  const fetchMyTeam = useCallback(async () => {
    if (!isTeamTask) {
      console.log('⏭️ Skipping fetchMyTeam - not a team task');
      return;
    }
    console.log('🔍 Fetching my team for assignment:', id);
    try {
      const data = await teamAPI.getMyTeam(id);
      console.log('👥 My team data:', data);
      setMyTeam(data);
    } catch (e) {
      console.error('❌ Error fetching team:', e);
      setMyTeam(null);
    }
  }, [id, isTeamTask]);

  const fetchSolution = useCallback(async () => {
    try {
      if (isTeamTask) {
        console.log('🔍 Fetching team solution for:', id);
        const data = await teamSolutionAPI.getMine(id);
        console.log('📦 Team solution data:', data);
        setTeamSolution(data);
        if (data?.selfAssessments) {
          const myAssessment = data.selfAssessments.find(sa => sa.userId === user?.id);
          setSelfAssessment(myAssessment?.evaluation || null);
        } else {
          setSelfAssessment(null);
        }
      } else {
        console.log('🔍 Fetching individual solution for:', id);
        const data = await solutionAPI.getMine(id);
        console.log('📦 Solution data:', data);
        setSolution(data);
        setSelfAssessment(data?.selfAssessment || null);
      }
    } catch (e) {
      console.log('⚠️ No solution found (this is normal if not submitted yet)');
      if (isTeamTask) setTeamSolution(null);
      else setSolution(null);
    }
  }, [id, isTeamTask, user?.id]);

  const fetchGradeDistribution = useCallback(async () => {
    if (!isTeamTask || !myTeam || !teamSolution?.score) return;
    try {
      const data = await gradeDistributionAPI.get(myTeam.id, id);
      setGradeDistribution(data);
    } catch {
      setGradeDistribution(null);
    }
  }, [isTeamTask, myTeam, id, teamSolution?.score]);

  const fetchSolutionComments = useCallback(async () => {
    const solId = isTeamTask ? teamSolution?.id : solution?.id;
    if (!solId) return;
    try {
      const data = await commentAPI.getForSolution(solId);
      setSolutionComments(Array.isArray(data) ? data : []);
    } catch {
      setSolutionComments([]);
    }
  }, [isTeamTask, teamSolution?.id, solution?.id]);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [fetchPost, fetchComments]);

  useEffect(() => {
    if (post?.type === 'task' || post?.type === 'teaM_TASK' || isTeamTask) {
      fetchMyTeam();
      fetchSolution();
    }
  }, [post, isTeamTask, fetchMyTeam, fetchSolution]);

  useEffect(() => {
    if (solution || teamSolution) {
      fetchSolutionComments();
    }
  }, [solution, teamSolution, fetchSolutionComments]);

  useEffect(() => {
    if (isTeamTask && myTeam && teamSolution?.score) {
      fetchGradeDistribution();
    }
  }, [isTeamTask, myTeam, teamSolution?.score, fetchGradeDistribution]);

  // Handlers
  const handleDeletePost = async () => {
    try {
      await postAPI.delete(id);
      message.success('Запись удалена');
      navigate(-1);
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleUploadSolFile = async (file) => {
    setSolUploading(true);
    try {
      const data = await filesAPI.upload(file);
      setSolFiles((prev) => [...prev, { id: data.id, name: file.name }]);
    } catch (e) {
      message.error(e.message);
    } finally {
      setSolUploading(false);
    }
    return false;
  };

  const handleJoinTeam = async () => {
    navigate(`/team/${id}/select`);
  };

  const handleLeaveTeam = async () => {
    if (myTeam) {
      console.log('🔍 Leaving team:', myTeam.id);
      try {
        await teamAPI.leave(myTeam.id);
        message.success('Вы покинули команду');
        fetchMyTeam();
      } catch (e) {
        console.error('❌ Error leaving team:', e);
        message.error(e.message);
      }
    }
  };

  const handleSubmitSolution = async () => {
    setSolSubmitting(true);
    try {
      const body = { 
        text: solText, 
        files: solFiles.map((f) => f.id),
      };
      
      if (selfAssessment) {
        body.selfAssessment = selfAssessment;
      }
      
      if (isTeamTask) {
        await teamSolutionAPI.submit(id, body);
      } else {
        await solutionAPI.submit(id, body);
      }
      message.success('Решение отправлено');
      setSolText('');
      setSolFiles([]);
      await fetchSolution();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSolSubmitting(false);
    }
  };

  const handleDeleteSolution = async () => {
    try {
      if (isTeamTask) {
        await teamSolutionAPI.delete(id);
        setTeamSolution(null);
      } else {
        await solutionAPI.delete(id);
        setSolution(null);
      }
      setSelfAssessment(null);
      message.success('Решение удалено');
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleSelfAssessmentChange = useCallback(async (assessment) => {
    setSelfAssessment(assessment);
    
    const isPending = isTeamTask ? teamSolution?.status === 'pending' : solution?.status === 'pending';
    
    if (isPending) {
      try {
        if (isTeamTask) {
          await teamSolutionAPI.submitSelfAssessment(id, assessment);
        } else {
          await solutionAPI.submit(id, { selfAssessment: assessment });
        }
        console.log('Самооценка автосохранена');
      } catch (e) {
        console.error('Ошибка автосохранения самооценки:', e);
      }
    }
  }, [isTeamTask, teamSolution?.status, solution?.status, id]);

  const handleGradeDistributionSave = async (teamId, assignmentId, entries) => {
    try {
      await gradeDistributionAPI.update(teamId, assignmentId, entries);
      message.success('Распределение баллов сохранено');
      fetchGradeDistribution();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleAddSolutionComment = async () => {
    const solId = isTeamTask ? teamSolution?.id : solution?.id;
    if (!solCommentText.trim() || !solId) return;
    setSolCommentLoading(true);
    try {
      await commentAPI.addToSolution(solId, solCommentText.trim());
      setSolCommentText('');
      await fetchSolutionComments();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSolCommentLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      await commentAPI.addToPost(id, commentText.trim());
      setCommentText('');
      await fetchComments();
    } catch (e) {
      message.error(e.message);
    } finally {
      setCommentLoading(false);
    }
  };

  const statusLabels = useMemo(() => ({
    pending: { text: 'На проверке', color: 'processing' },
    checked: { text: 'Проверено', color: 'success' },
    returned: { text: 'Возвращено', color: 'warning' },
  }), []);

  const hasCriteria = useMemo(() => 
    Boolean(
      criteriaConfig?.weightedCriteria?.length ||
      criteriaConfig?.bonusPenalties?.length ||
      criteriaConfig?.qualityCoefficients?.length ||
      criteriaConfig?.blockingModifiers?.length
    ),
    [criteriaConfig]
  );

  const canEditSelfAssessment = useMemo(() => {
    const currentStatus = isTeamTask ? teamSolution?.status : solution?.status;
    if (!currentStatus) return true;
    return currentStatus === 'pending';
  }, [isTeamTask, teamSolution?.status, solution?.status]);

  const currentSolution = isTeamTask ? teamSolution : solution;
  const canSubmit = !currentSolution || currentSolution.status === 'returned';
  const isAssignment = post?.type === 'task' || post?.type === 'teaM_TASK' || isTeamTask;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!post) return null;

  const teamMembersColumns = [
    {
      title: 'Участник',
      dataIndex: 'credentials',
      key: 'credentials',
      render: (text, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          {text}
          {(
            record.role === 'leader' ||
            record.role === 'captain' ||
            (normalizeCaptainMode(post?.captainMode) === 'firstMember' && idsEqual(getMemberId(record), getMemberId(myTeam?.members?.[0])))
          ) && <CrownOutlined style={{ color: '#faad14' }} />}
        </Space>
      ),
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (role, record) => {
        const isFirstMemberCaptain =
          normalizeCaptainMode(post?.captainMode) === 'firstMember' &&
          idsEqual(getMemberId(record), getMemberId(myTeam?.members?.[0]));
        const isLeader = role === 'leader' || role === 'captain' || isFirstMemberCaptain;
        return (
          <Tag color={isLeader ? 'gold' : 'default'}>
            {isLeader ? 'Капитан' : 'Участник'}
          </Tag>
        );
      },
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        Назад
      </Button>

      {/* Карточка поста/задания */}
      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <Tag color={isAssignment ? 'blue' : 'default'}>{isAssignment ? 'Задание' : 'Пост'}</Tag>
            {isTeamTask && <Tag color="purple" icon={<TeamOutlined />}>Командное</Tag>}
            <Title level={3} style={{ margin: '8px 0 0' }}>{post.title}</Title>
          </div>
          {isTeacher && (
            <Space>
              {isTeamTask && (
                <Button icon={<TeamOutlined />} onClick={() => navigate(`/team/${id}/grading`)}>
                  Командные решения
                </Button>
              )}
              <Button icon={<EditOutlined />} onClick={() => navigate(`/post/${id}/edit`)}>Редактировать</Button>
              <Popconfirm title="Удалить запись?" onConfirm={handleDeletePost} okText="Да" cancelText="Нет">
                <Button danger icon={<DeleteOutlined />}>Удалить</Button>
              </Popconfirm>
            </Space>
          )}
        </div>

        <Paragraph style={{ fontSize: 15, whiteSpace: 'pre-wrap' }}>{post.text}</Paragraph>

        {isAssignment && (
          <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
            {post.deadline && (
              <Descriptions.Item label="Дедлайн">
                <ClockCircleOutlined style={{ marginRight: 6 }} />
                {dayjs(post.deadline).format('DD.MM.YYYY HH:mm')}
              </Descriptions.Item>
            )}
            {post.maxScore != null && <Descriptions.Item label="Макс. балл">{post.maxScore}</Descriptions.Item>}
            {post.taskType && (
              <Descriptions.Item label="Тип">
                <Tag color={post.taskType === 'mandatory' ? 'red' : 'blue'}>
                  {post.taskType === 'mandatory' ? 'Обязательное' : 'Дополнительное'}
                </Tag>
              </Descriptions.Item>
            )}
            {isTeamTask && (
              <>
                <Descriptions.Item label="Размер команды">
                  {post.minTeamSize || 1} - {post.maxTeamSize || '不限'} человек
                </Descriptions.Item>
                <Descriptions.Item label="Режим капитана">
                  {normalizeCaptainMode(post.captainMode) === 'firstMember' && 'Первый участник становится капитаном'}
                  {normalizeCaptainMode(post.captainMode) === 'votingAndLottery' && 'Голосование и жеребьёвка'}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        )}

        {post.files?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong>Файлы:</Text>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {post.files.map((f) => (
                <a key={f.id} href={filesAPI.getUrl(f.id)} target="_blank" rel="noreferrer">
                  <Tag icon={<FileOutlined />} color="blue" style={{ cursor: 'pointer' }}>{f.name}</Tag>
                </a>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Командная информация для студентов */}
      {isAssignment && isStudent && isTeamTask && (
        <Card title="👥 Команда" style={{ marginBottom: 24 }}>
          {myTeam ? (
            <div>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>Команда: {myTeam.name}</Text>
                <Popconfirm title="Вы уверены, что хотите покинуть команду?" onConfirm={handleLeaveTeam}>
                  <Button icon={<LogoutOutlined />} danger size="small">Покинуть команду</Button>
                </Popconfirm>
              </div>
              <Table
                columns={teamMembersColumns}
                dataSource={myTeam.members || []}
                rowKey="userId"
                pagination={false}
                size="small"
              />
              <Button
                type="primary"
                icon={<TeamOutlined />}
                onClick={() => navigate(`/team/${id}/leader`)}
                style={{ marginTop: 12 }}
              >
                Открыть командное решение
              </Button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Вы ещё не в команде</Text>
              <div style={{ marginTop: 12 }}>
                <Button type="primary" icon={<LoginOutlined />} onClick={handleJoinTeam}>
                  Выбрать команду
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Секция решения - ДЛЯ СТУДЕНТОВ */}
      {isAssignment && isStudent && (!isTeamTask || myTeam) && (
        <Card title="Ваше решение" style={{ borderRadius: 12, marginBottom: 24 }}>
          {/* Самооценка для студентов */}
          {hasCriteria && (
            <Collapse style={{ marginBottom: 16 }} defaultActiveKey={currentSolution?.selfAssessment ? [] : ['1']}>
              <Panel 
                header={
                  <span>
                    <UserOutlined /> 
                    {currentSolution?.selfAssessment && currentSolution.status !== 'pending' 
                      ? ' Ваша самооценка' 
                      : ' Самооценка работы'}
                  </span>
                } 
                key="1"
              >
                <SelfAssessmentForm
                  assignmentConfig={criteriaConfig}
                  initialAssessment={selfAssessment}
                  onChange={handleSelfAssessmentChange}
                  readOnly={!canEditSelfAssessment}
                />
                {currentSolution && currentSolution.status === 'pending' && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                    💡 Самооценка автоматически сохраняется. Вы можете изменить её до проверки преподавателем.
                  </Text>
                )}
              </Panel>
            </Collapse>
          )}

          {/* Распределение баллов для капитана */}
          {isTeamTask && isCaptain && gradeDistribution && teamSolution?.score !== null && (
            <div style={{ marginBottom: 16 }}>
              <GradeDistributionForm
                teamId={myTeam?.id}
                assignmentId={id}
                teamRawScore={teamSolution?.score}
                members={myTeam?.members || []}
                initialDistribution={gradeDistribution?.entries}
                onSave={handleGradeDistributionSave}
                isCaptain={true}
                readOnly={false}
              />
            </div>
          )}

          {currentSolution ? (
            // Уже отправленное решение
            <div>
              <div style={{ marginBottom: 12 }}>
                <Tag color={statusLabels[currentSolution.status]?.color || 'default'}>
                  {statusLabels[currentSolution.status]?.text || currentSolution.status}
                </Tag>
                {currentSolution.score != null && (
                  <Tag color="green">Оценка команды: {currentSolution.score}/{post.maxScore}</Tag>
                )}
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {dayjs(currentSolution.updatedDate).format('DD.MM.YYYY HH:mm')}
                </Text>
              </div>
              
              {currentSolution.breakdown && <GradeBreakdown breakdown={currentSolution.breakdown} maxScore={post.maxScore} />}
              
              {currentSolution.text && <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{currentSolution.text}</Paragraph>}
              
              {currentSolution.files?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {currentSolution.files.map((f) => (
                    <a key={f.id} href={filesAPI.getUrl(f.id)} target="_blank" rel="noreferrer">
                      <Tag icon={<DownloadOutlined />} color="blue">{f.name}</Tag>
                    </a>
                  ))}
                </div>
              )}
              
              {currentSolution.status !== 'checked' && (
                <Popconfirm title="Удалить решение?" onConfirm={handleDeleteSolution} okText="Да" cancelText="Нет">
                  <Button danger size="small">Удалить решение</Button>
                </Popconfirm>
              )}

              <Divider />
              <div>
                <Title level={5}><MessageOutlined /> Комментарии к решению</Title>
                <div style={{ marginBottom: 12 }}>
                  <TextArea rows={2} value={solCommentText} onChange={(e) => setSolCommentText(e.target.value)} placeholder="Написать комментарий..." />
                  <Button type="primary" size="small" style={{ marginTop: 6 }} loading={solCommentLoading} onClick={handleAddSolutionComment} icon={<SendOutlined />}>Отправить</Button>
                </div>
                {solutionComments.length === 0 ? (
                  <Text type="secondary">Нет комментариев</Text>
                ) : (
                  solutionComments.map((c) => <CommentItem key={c.id} comment={c} onRefreshParent={fetchSolutionComments} />)
                )}
              </div>
            </div>
          ) : canSubmit && (
            // Форма для нового решения
            <div>
              <TextArea
                rows={3}
                value={solText}
                onChange={(e) => setSolText(e.target.value)}
                placeholder="Комментарий к решению..."
                style={{ marginBottom: 12 }}
              />
              
              <div style={{ marginBottom: 12 }}>
                <Upload beforeUpload={handleUploadSolFile} showUploadList={false}>
                  <Button loading={solUploading} icon={<FileOutlined />}>Прикрепить файл</Button>
                </Upload>
                {solFiles.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {solFiles.map((f) => (
                      <Tag key={f.id} closable onClose={() => setSolFiles((prev) => prev.filter((x) => x.id !== f.id))}>{f.name}</Tag>
                    ))}
                  </div>
                )}
              </div>
              
              <Button type="primary" icon={<SendOutlined />} loading={solSubmitting} onClick={handleSubmitSolution}>Отправить решение</Button>
            </div>
          )}
        </Card>
      )}

      {/* Для преподавателя - только просмотр решения */}
      {isAssignment && isTeacher && currentSolution && (
        <Card title={isTeamTask ? "Решение команды" : "Решение студента"} style={{ borderRadius: 12, marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <Tag color={statusLabels[currentSolution.status]?.color || 'default'}>
              {statusLabels[currentSolution.status]?.text || currentSolution.status}
            </Tag>
            {currentSolution.score != null && (
              <Tag color="green">
                {isTeamTask ? `Оценка команды: ${currentSolution.score}/${post.maxScore}` : `Оценка: ${currentSolution.score}/${post.maxScore}`}
              </Tag>
            )}
            <Text type="secondary" style={{ marginLeft: 8 }}>
              {dayjs(currentSolution.updatedDate).format('DD.MM.YYYY HH:mm')}
            </Text>
          </div>
          
          {currentSolution.breakdown && <GradeBreakdown breakdown={currentSolution.breakdown} maxScore={post.maxScore} />}
          
          {isTeamTask && currentSolution.selfAssessments && (
            <Collapse style={{ marginBottom: 12 }}>
              <Panel header="Самооценки участников" key="selfAssessments">
                {currentSolution.selfAssessments.map((sa) => (
                  <Card key={sa.userId} size="small" style={{ marginBottom: 8 }}>
                    <Text strong>{sa.credentials}</Text>
                    {sa.evaluation && (
                      <div style={{ marginTop: 8 }}>
                        {sa.evaluation.weightedValues?.map(wv => (
                          <div key={wv.criterionId}>Критерий: {wv.score} баллов</div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </Panel>
            </Collapse>
          )}
          
          {currentSolution.text && <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{currentSolution.text}</Paragraph>}
          
          {currentSolution.files?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {currentSolution.files.map((f) => (
                <a key={f.id} href={filesAPI.getUrl(f.id)} target="_blank" rel="noreferrer">
                  <Tag icon={<DownloadOutlined />} color="blue">{f.name}</Tag>
                </a>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Комментарии к посту */}
      <Card title={<span><MessageOutlined /> Комментарии</span>} style={{ borderRadius: 12 }}>
        <div style={{ marginBottom: 16 }}>
          <TextArea rows={2} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Написать комментарий..." />
          <Button type="primary" size="small" style={{ marginTop: 8 }} loading={commentLoading} onClick={handleAddComment} icon={<SendOutlined />}>Отправить</Button>
        </div>
        {comments.length === 0 ? (
          <Empty description="Пока нет комментариев" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          comments.map((c) => <CommentItem key={c.id} comment={c} onRefreshParent={fetchComments} />)
        )}
      </Card>
    </div>
  );
}
