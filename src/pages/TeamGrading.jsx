import React, { useState, useEffect } from 'react';
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
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function TeamGrading() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [solutions, setSolutions] = useState([]);
  const [selectedSolution, setSelectedSolution] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [distributionModalOpen, setDistributionModalOpen] = useState(false);
  const [selectedTeamDistribution, setSelectedTeamDistribution] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSolutions();
  }, [taskId]);

  const loadSolutions = async () => {
    setLoading(true);
    try {
      const data = await teamTaskAPI.getAllSolutions(taskId);
      setSolutions(data.records || []);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
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
      message.success('Оценка выставлена');
      setModalOpen(false);
      form.resetFields();
      loadSolutions();
    } catch (error) {
      message.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (solution) => {
    setSelectedSolution(solution);
    form.setFieldsValue({
      score: solution.score || 0,
      status: solution.status || 'pending',
      comment: '',
    });
    setModalOpen(true);
  };

  const openDistributionModal = async (teamId, teamName) => {
    try {
      const [distribution, allTeams] = await Promise.all([
        gradeDistributionAPI.get(teamId, taskId),
        teamTaskAPI.getTeams(taskId),
      ]);
      
      const team = allTeams.find(t => t.id === teamId);
      
      // Создаём карту userId -> credentials с учётом разных вариантов полей
      const userMap = {};
      team?.members?.forEach(member => {
        // Пробуем все возможные варианты ID
        const userId = member.userId || member.id || member.studentId;
        const userName = member.credentials || member.name || member.fullName;
        if (userId) {
          userMap[userId] = userName;
        }
        // Также добавляем по всем возможным ключам
        if (member.userId && member.credentials) {
          userMap[member.userId] = member.credentials;
        }
        if (member.id && member.name) {
          userMap[member.id] = member.name;
        }
      });
      
      // Обогащаем entries именами
      const enrichedEntries = (distribution.entries || []).map(entry => {
        const userId = entry.userId || entry.studentId || entry.id;
        let userName = userMap[userId];
        
        // Если не нашли по прямому соответствию, пробуем найти по частичному совпадению
        if (!userName && userId) {
          const match = Object.entries(userMap).find(([key, val]) => 
            key === userId || key.includes(userId) || userId.includes(key)
          );
          if (match) {
            userName = match[1];
          }
        }
        
        return {
          ...entry,
          userName: userName || userId || 'Неизвестный участник',
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
      console.error('Ошибка:', error);
      message.error('Не удалось загрузить распределение');
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
        <Title level={3} style={{ margin: 0 }}>Оценка командных решений</Title>
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
        title="Оценить решение"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
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

            <Form form={form} layout="vertical" onFinish={handleReview}>
              <Form.Item
                name="score"
                label="Оценка"
                rules={[{ required: true, message: 'Введите оценку' }]}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} size="large" />
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