import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  Input,
  InputNumber,
  Select,
  Table,
  Tag,
  message,
  Spin,
  Alert,
  Divider,
  Space,
  Modal,
  Form,
  Tooltip,
  App,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  RollbackOutlined,
  EyeOutlined,
  FileOutlined,
  TeamOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { teamTaskAPI, filesAPI, gradeDistributionAPI } from '../shared/api/endpoints';
import { convertFullPostConfig } from '../shared/utils/convertCriteria';
import GradeForm from '../components/GradeForm';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function TeamGrading() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { message: messageApi } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [solutions, setSolutions] = useState([]);
  const [task, setTask] = useState(null);
  const [gradeFormConfig, setGradeFormConfig] = useState(null);
  const [selectedSolution, setSelectedSolution] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [distributionModalOpen, setDistributionModalOpen] = useState(false);
  const [selectedTeamDistribution, setSelectedTeamDistribution] = useState(null);
  const [manualReviewInitialValues, setManualReviewInitialValues] = useState({
    score: 0,
    status: 'checked',
    comment: '',
  });

  useEffect(() => {
    loadTask();
    loadSolutions();
  }, [taskId]);

  const loadTask = async () => {
    try {
      const data = await teamTaskAPI.getTaskDetails(taskId);
      console.log('📦 Task data loaded:', data);
      setTask(data);
      if (data.criteria && data.criteria.length > 0) {
        const config = convertFullPostConfig(data);
        console.log('🔍 GradeForm config from task:', {
          weightedCriteria: config?.weightedCriteria?.map(c => ({ id: c.id, title: c.title, maxPoints: c.maxPoints, weight: c.weight })),
          bonusPenalties: config?.bonusPenalties?.map(b => ({ id: b.id, title: b.title, score: b.score, direction: b.direction })),
          qualityCoefficients: config?.qualityCoefficients?.map(q => ({ id: q.id, title: q.title })),
          blockingModifiers: config?.blockingModifiers?.map(b => ({ id: b.id, title: b.title })),
        });
        setGradeFormConfig(config);
      } else {
        console.log('⚠️ No criteria found in task');
        setGradeFormConfig(null);
      }
    } catch (error) {
      console.error('❌ Error loading task:', error);
      messageApi.error(error.message);
    }
  };

  const loadSolutions = async () => {
    setLoading(true);
    try {
      const data = await teamTaskAPI.getAllSolutions(taskId);
      console.log('📦 Solutions loaded:', data.records?.length || 0);
      setSolutions(data.records || []);
    } catch (error) {
      console.error('❌ Error loading solutions:', error);
      messageApi.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (evaluation) => {
    if (!selectedSolution) {
      console.log('⚠️ No selected solution for preview');
      return null;
    }
    
    console.log('🔍 Preview evaluation:', JSON.stringify(evaluation, null, 2));
    
    try {
      const result = await teamTaskAPI.previewGrade(selectedSolution.id, evaluation);
      console.log('✅ Preview result:', result);
      return result;
    } catch (error) {
      console.error('❌ Team grade preview failed:', error);
      if (error.response?.data) {
        console.error('Server error details:', error.response.data);
      }
      // Возвращаем заглушку, чтобы форма не ломалась
      return {
        baseScore: 0,
        latePenalty: 0,
        afterQualityCoefficient: 0,
        afterLatePenalty: 0,
        afterBlocking: 0,
        finalScore: 0,
        expiredDays: 0,
        thresholdApplied: false,
        thresholdReason: null
      };
    }
  };

  const handleSubmitCriteriaReview = async (evaluation, score, status, comment) => {
    if (!selectedSolution) return;
    setSubmitting(true);
    try {
      console.log('📤 Submitting criteria review:', { solutionId: selectedSolution.id, score, status, evaluation });
      await teamTaskAPI.reviewSolution(selectedSolution.id, {
        score,
        status,
        comment: comment || '',
        evaluation,
      });
      messageApi.success('Оценка по критериям сохранена');
      setModalOpen(false);
      await loadSolutions();
    } catch (error) {
      console.error('❌ Error submitting review:', error);
      messageApi.error(error.message || 'Ошибка при сохранении оценки');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (values) => {
    if (!selectedSolution) return;
    setSubmitting(true);
    try {
      await teamTaskAPI.reviewSolution(selectedSolution.id, {
        score: values.score,
        status: values.status,
        comment: values.comment || '',
      });
      messageApi.success('Оценка выставлена');
      setModalOpen(false);
      await loadSolutions();
    } catch (error) {
      console.error('❌ Error submitting review:', error);
      messageApi.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (solution) => {
    console.log('🔍 Opening review modal for solution:', solution.id);
    setSelectedSolution(solution);
    setManualReviewInitialValues({
      score: solution.score || 0,
      status: solution.status === 'returned' ? 'returned' : 'checked',
      comment: '',
    });
    setModalOpen(true);
  };

  const hasCriteria = useMemo(() =>
    Boolean(
      gradeFormConfig?.weightedCriteria?.length ||
      gradeFormConfig?.bonusPenalties?.length ||
      gradeFormConfig?.qualityCoefficients?.length ||
      gradeFormConfig?.blockingModifiers?.length
    ),
    [gradeFormConfig]
  );

  const openDistributionModal = async (teamId, teamName) => {
    try {
      console.log('🔍 Opening distribution modal for team:', teamId);
      const [distribution, allTeams] = await Promise.all([
        gradeDistributionAPI.get(teamId, taskId),
        teamTaskAPI.getTeams(taskId),
      ]);
      
      console.log('📦 Distribution data:', distribution);
      console.log('📦 All teams:', allTeams);
      
      const team = allTeams.find(t => t.id === teamId);
      
      const userMap = {};
      team?.members?.forEach(member => {
        const userId = member.userId || member.id || member.studentId;
        const userName = member.credentials || member.name || member.fullName;
        if (userId && userName) {
          userMap[userId] = userName;
        }
      });
      
      const enrichedEntries = (distribution.entries || []).map(entry => {
        const userId = entry.userId || entry.studentId || entry.id;
        const userName = userMap[userId] || userId || 'Неизвестный участник';
        return {
          ...entry,
          userName,
          originalUserId: userId,
        };
      });
      
      setSelectedTeamDistribution({
        teamName: teamName,
        entries: enrichedEntries,
        teamRawScore: distribution.teamRawScore || 0,
      });
      setDistributionModalOpen(true);
    } catch (error) {
      console.error('❌ Error loading distribution:', error);
      messageApi.error('Не удалось загрузить распределение');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'checked': return 'green';
      case 'pending': return 'orange';
      case 'returned': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'checked': return 'Проверено';
      case 'pending': return 'На проверке';
      case 'returned': return 'Возвращено';
      default: return 'Черновик';
    }
  };

  const columns = [
    {
      title: 'Команда',
      key: 'team',
      render: (_, record) => (
        <Space>
          <TeamOutlined />
          <Text strong>{record.team?.name || 'Без названия'}</Text>
        </Space>
      ),
    },
    {
      title: 'Решение',
      dataIndex: 'text',
      key: 'text',
      ellipsis: true,
      render: (text) => text || '—',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: 'Оценка',
      dataIndex: 'score',
      key: 'score',
      render: (score) => score !== undefined ? `${score} баллов` : '—',
    },
    {
      title: 'Дата',
      dataIndex: 'updatedDate',
      key: 'updatedDate',
      render: (date) => date ? dayjs(date).format('DD.MM.YYYY HH:mm') : '—',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Оценить решение">
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => openReviewModal(record)}
            >
              Оценить
            </Button>
          </Tooltip>
          <Tooltip title="Посмотреть распределение баллов">
            <Button
              size="small"
              icon={<PieChartOutlined />}
              onClick={() => openDistributionModal(record.team.id, record.team?.name)}
            >
              Распределение
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
        <div>
          <Title level={3} style={{ margin: 0 }}>Оценка командных решений</Title>
          {task?.title && (
            <Text type="secondary">
              {task.title}{task.maxScore ? ` · макс. ${task.maxScore} баллов` : ''}
            </Text>
          )}
        </div>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={solutions}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Модальное окно для оценки решения */}
      <Modal
        title={hasCriteria ? 'Оценить решение по критериям' : 'Оценить решение'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={hasCriteria ? 780 : 600}
        destroyOnClose
      >
        {selectedSolution && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Команда: </Text>
              <Text>{selectedSolution.team?.name || 'Без названия'}</Text>
            </div>
            
            {selectedSolution.text && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>Решение: </Text>
                <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                  {selectedSolution.text}
                </div>
              </div>
            )}
            
            {selectedSolution.files && selectedSolution.files.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>Файлы: </Text>
                <div style={{ marginTop: 8 }}>
                  {selectedSolution.files.map((file) => (
                    <a key={file.id} href={filesAPI.getUrl(file.id)} target="_blank" rel="noreferrer">
                      <Tag icon={<FileOutlined />} color="blue">{file.name}</Tag>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <Divider />

            {hasCriteria ? (
              <GradeForm
                assignmentConfig={gradeFormConfig}
                initialEvaluation={selectedSolution.teacherEvaluation}
                onPreview={handlePreview}
                onSubmit={handleSubmitCriteriaReview}
                loading={submitting}
              />
            ) : (
              <Form
                key={selectedSolution.id}
                layout="vertical"
                initialValues={manualReviewInitialValues}
                onFinish={handleReview}
              >
                <Form.Item
                  name="score"
                  label={`Оценка${task?.maxScore ? ` (макс. ${task.maxScore})` : ''}`}
                  rules={[{ required: true, message: 'Введите оценку' }]}
                >
                  <InputNumber min={0} max={task?.maxScore || 100} style={{ width: '100%' }} size="large" />
                </Form.Item>

                <Form.Item
                  name="status"
                  label="Статус"
                  rules={[{ required: true }]}
                >
                  <Select
                    size="large"
                    options={[
                      { value: 'checked', label: <span><CheckOutlined style={{ color: '#52c41a' }} /> Принято</span> },
                      { value: 'returned', label: <span><RollbackOutlined style={{ color: '#faad14' }} /> Вернуть на доработку</span> },
                    ]}
                  />
                </Form.Item>

                <Form.Item name="comment" label="Комментарий">
                  <TextArea rows={3} placeholder="Приватный комментарий..." />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
                    Сохранить оценку
                  </Button>
                </Form.Item>
              </Form>
            )}
          </div>
        )}
      </Modal>

      {/* Модальное окно для просмотра распределения баллов */}
      <Modal
        title={`Распределение баллов: ${selectedTeamDistribution?.teamName || 'Команда'}`}
        open={distributionModalOpen}
        onCancel={() => setDistributionModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDistributionModalOpen(false)}>
            Закрыть
          </Button>,
        ]}
        width={500}
      >
        {selectedTeamDistribution && (
          <div>
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
                Общий балл команды: {selectedTeamDistribution.teamRawScore}
              </Tag>
            </div>
            <Divider />
            <div style={{ marginBottom: 12 }}>
              <Text strong>Распределение между участниками:</Text>
            </div>
            {selectedTeamDistribution.entries.length > 0 ? (
              selectedTeamDistribution.entries.map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    marginBottom: 8,
                    background: '#f5f5f5',
                    borderRadius: 8,
                  }}
                >
                  <Text>👤 {entry.userName}</Text>
                  <Text strong style={{ color: '#52c41a' }}>
                    {entry.points} баллов
                  </Text>
                </div>
              ))
            ) : (
              <Text type="secondary">Распределение ещё не настроено</Text>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}