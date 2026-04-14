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
  Rate,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  RollbackOutlined,
  EyeOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { teamTaskAPI, teamSolutionAPI, filesAPI, gradeDistributionAPI } from '../shared/api/endpoints';
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
      render: (_, record) => record.team?.name || 'Без названия',
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
      render: (score) => score !== undefined ? `${score}` : '—',
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
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => openReviewModal(record)}
          >
            Оценить
          </Button>
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
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
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
    </div>
  );
}