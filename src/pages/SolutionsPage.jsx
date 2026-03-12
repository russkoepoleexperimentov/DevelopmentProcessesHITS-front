import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Card,
  Table,
  Tag,
  Button,
  Select,
  Space,
  Drawer,
  Descriptions,
  Input,
  InputNumber,
  Modal,
  Form,
  Divider,
  List,
  message,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  RollbackOutlined,
  FileOutlined,
  MessageOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { postAPI, solutionAPI, commentAPI, filesAPI } from '../shared/api/endpoints';
import dayjs from 'dayjs';
import CommentItem from '../shared/ui/CommentItem';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const statusMap = {
  pending: { text: 'На проверке', color: 'processing' },
  checked: { text: 'Проверено', color: 'success' },
  returned: { text: 'Возвращено', color: 'warning' },
};

export default function SolutionsPage() {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [solutions, setSolutions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // Review modal
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewForm] = Form.useForm();
  const [reviewLoading, setReviewLoading] = useState(false);

  // Solution comments
  const [solComments, setSolComments] = useState([]);
  const [solCommentText, setSolCommentText] = useState('');
  const [solCommentLoading, setSolCommentLoading] = useState(false);

  const pageSize = 20;

  const fetchPost = useCallback(async () => {
    try {
      const data = await postAPI.getById(postId);
      setPost(data);
    } catch (e) {
      message.error(e.message);
      navigate(-1);
    }
  }, [postId, navigate]);

  const fetchSolutions = useCallback(
    async (p = 1, status = '') => {
      setLoading(true);
      try {
        const data = await solutionAPI.getAll(
          postId,
          (p - 1) * pageSize,
          pageSize,
          status
        );
        setSolutions(data.records || []);
        setTotal(data.totalRecords || 0);
      } catch (e) {
        message.error(e.message);
      } finally {
        setLoading(false);
      }
    },
    [postId]
  );

  useEffect(() => {
    fetchPost();
    fetchSolutions(1, '');
  }, [fetchPost, fetchSolutions]);

  const handleStatusChange = (v) => {
    setStatusFilter(v);
    setPage(1);
    fetchSolutions(1, v);
  };

  const handlePageChange = (p) => {
    setPage(p);
    fetchSolutions(p, statusFilter);
  };

  const openDrawer = async (sol) => {
    setSelected(sol);
    setDrawerOpen(true);
    // Load comments
    try {
      const data = await commentAPI.getForSolution(sol.id);
      setSolComments(Array.isArray(data) ? data : []);
    } catch {
      setSolComments([]);
    }
  };

  const handleReview = async (values) => {
    if (!selected) return;
    setReviewLoading(true);
    try {
      await solutionAPI.review(selected.id, {
        score: values.score,
        status: values.status,
        comment: values.comment || '',
      });
      message.success('Решение оценено');
      setReviewOpen(false);
      reviewForm.resetFields();
      fetchSolutions(page, statusFilter);
      setDrawerOpen(false);
    } catch (e) {
      message.error(e.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAddSolComment = async () => {
    if (!solCommentText.trim() || !selected) return;
    setSolCommentLoading(true);
    try {
      await commentAPI.addToSolution(selected.id, solCommentText.trim());
      setSolCommentText('');
      const data = await commentAPI.getForSolution(selected.id);
      setSolComments(Array.isArray(data) ? data : []);
    } catch (e) {
      message.error(e.message);
    } finally {
      setSolCommentLoading(false);
    }
  };

  const columns = [
    {
      title: 'Студент',
      key: 'user',
      render: (_, record) => record.user?.credentials || '—',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (s) => (
        <Tag color={statusMap[s]?.color || 'default'}>
          {statusMap[s]?.text || s}
        </Tag>
      ),
    },
    {
      title: 'Оценка',
      dataIndex: 'score',
      key: 'score',
      render: (s) =>
        s != null ? `${s}/${post?.maxScore || '?'}` : '—',
    },
    {
      title: 'Дата',
      dataIndex: 'updatedDate',
      key: 'updatedDate',
      render: (d) => (d ? dayjs(d).format('DD.MM.YYYY HH:mm') : '—'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Button type="link" onClick={() => openDrawer(record)}>
          Подробнее
        </Button>
      ),
    },
  ];

  if (!post && !loading) return null;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Решения: {post?.title || ''}
          </Title>
          {post?.maxScore && (
            <Text type="secondary">Макс. балл: {post.maxScore}</Text>
          )}
        </div>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <div style={{ marginBottom: 16 }}>
          <Select
            value={statusFilter}
            onChange={handleStatusChange}
            style={{ width: 200 }}
            size="large"
            placeholder="Фильтр по статусу"
            allowClear
            options={[
              { value: '', label: 'Все статусы' },
              { value: 'pending', label: 'На проверке' },
              { value: 'checked', label: 'Проверено' },
              { value: 'returned', label: 'Возвращено' },
            ]}
          />
        </div>

        <Table
          columns={columns}
          dataSource={solutions}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize,
            onChange: handlePageChange,
            showSizeChanger: false,
          }}
        />
      </Card>

      {/* Solution Detail Drawer */}
      <Drawer
        title="Решение студента"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
        extra={
          <Button
            type="primary"
            onClick={() => {
              reviewForm.setFieldsValue({
                score: selected?.score || 0,
                status: 'checked',
                comment: '',
              });
              setReviewOpen(true);
            }}
          >
            Оценить
          </Button>
        }
      >
        {selected && (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Студент">
                {selected.user?.credentials}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                <Tag color={statusMap[selected.status]?.color || 'default'}>
                  {statusMap[selected.status]?.text || selected.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Оценка">
                {selected.score != null
                  ? `${selected.score}/${post?.maxScore || '?'}`
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Дата">
                {selected.updatedDate
                  ? dayjs(selected.updatedDate).format('DD.MM.YYYY HH:mm')
                  : '—'}
              </Descriptions.Item>
            </Descriptions>

            {selected.text && (
              <div style={{ marginTop: 16 }}>
                <Text strong>Комментарий студента:</Text>
                <Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                  {selected.text}
                </Paragraph>
              </div>
            )}

            {selected.files && selected.files.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text strong>Файлы:</Text>
                <div
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {selected.files.map((f) => (
                    <a
                      key={f.id}
                      href={filesAPI.getUrl(f.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Tag icon={<FileOutlined />} color="blue">
                        {f.name}
                      </Tag>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <Divider />

            {/* Solution comments */}
            <div>
              <Title level={5}>
                <MessageOutlined style={{ marginRight: 6 }} />
                Комментарии к решению
              </Title>

              <div style={{ marginBottom: 12 }}>
                <TextArea
                  rows={2}
                  value={solCommentText}
                  onChange={(e) => setSolCommentText(e.target.value)}
                  placeholder="Написать комментарий..."
                />
                <Button
                  type="primary"
                  size="small"
                  style={{ marginTop: 6 }}
                  loading={solCommentLoading}
                  onClick={handleAddSolComment}
                  icon={<SendOutlined />}
                >
                  Отправить
                </Button>
              </div>

              {solComments.length === 0 ? (
                <Text type="secondary">Нет комментариев</Text>
              ) : (
                solComments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    onRefreshParent={() => {
                      // Перезагружаем комментарии после изменений (удаление/редактирование/ответ)
                      commentAPI.getForSolution(selected.id).then(setSolComments).catch(() => setSolComments([]));
                    }}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Review Modal */}
      <Modal
        title="Оценить решение"
        open={reviewOpen}
        onCancel={() => setReviewOpen(false)}
        footer={null}
      >
        <Form form={reviewForm} layout="vertical" onFinish={handleReview}>
          <Form.Item
            name="score"
            label={`Оценка (макс. ${post?.maxScore || 5})`}
            rules={[{ required: true, message: 'Введите оценку' }]}
          >
            <InputNumber
              min={0}
              max={post?.maxScore || 100}
              size="large"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="Статус"
            rules={[{ required: true }]}
          >
            <Select
              size="large"
              options={[
                {
                  value: 'checked',
                  label: (
                    <span>
                      <CheckOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                      Принято
                    </span>
                  ),
                },
                {
                  value: 'returned',
                  label: (
                    <span>
                      <RollbackOutlined
                        style={{ color: '#faad14', marginRight: 6 }}
                      />
                      Вернуть на доработку
                    </span>
                  ),
                },
              ]}
            />
          </Form.Item>

          <Form.Item name="comment" label="Комментарий">
            <TextArea rows={3} placeholder="Приватный комментарий..." />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={reviewLoading}
            >
              Отправить оценку
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
