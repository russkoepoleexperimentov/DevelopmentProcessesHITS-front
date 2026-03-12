import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Typography,
  Tag,
  Button,
  Spin,
  List,
  Card,
  Modal,
  Input,
  Form,
  Pagination,
  Tooltip,
  message,
  Popconfirm,
  Space,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  TeamOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  CopyOutlined,
  LogoutOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { courseAPI } from '../shared/api/endpoints';
import { useAuth } from '../shared/lib/authContext';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

export default function CoursePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [feed, setFeed] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();

  const pageSize = 10;
  const isTeacher = course?.role === 'teacher';
  const isAuthor = user && course && user.id === course.authorId;

  const fetchCourse = useCallback(async () => {
    try {
      const data = await courseAPI.getById(id);
      setCourse(data);
    } catch (e) {
      message.error(e.message);
      navigate('/');
    }
  }, [id, navigate]);

  const fetchFeed = useCallback(
    async (p = 1) => {
      setFeedLoading(true);
      try {
        const data = await courseAPI.getFeed(id, (p - 1) * pageSize, pageSize);
        setFeed(data.records || []);
        setTotal(data.totalRecords || 0);
      } catch (e) {
        message.error(e.message);
      } finally {
        setFeedLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchCourse();
      await fetchFeed(1);
      setLoading(false);
    };
    init();
  }, [fetchCourse, fetchFeed]);

  const handlePageChange = (p) => {
    setPage(p);
    fetchFeed(p);
  };

  const handleEdit = async (values) => {
    setEditLoading(true);
    try {
      await courseAPI.update(id, { title: values.title });
      message.success('Курс обновлён');
      setEditOpen(false);
      fetchCourse();
    } catch (e) {
      message.error(e.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleLeave = async () => {
    try {
      await courseAPI.leave(id);
      message.success('Вы покинули курс');
      navigate('/');
    } catch (e) {
      message.error(e.message);
    }
  };

  const copyInviteCode = () => {
    if (course?.inviteCode) {
      navigator.clipboard.writeText(course.inviteCode);
      message.success('Код скопирован');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div>
      {/* Course Header */}
      <Card
        style={{
          borderRadius: 12,
          marginBottom: 24,
          background: 'linear-gradient(135deg, #1967d2, #4285f4)',
          border: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <Title level={2} style={{ color: '#fff', margin: 0 }}>
              {course.title}
            </Title>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Tag color={isTeacher ? 'blue' : 'green'}>
                {isTeacher ? 'Преподаватель' : 'Студент'}
              </Tag>
              {course.inviteCode && (
                <Tooltip title="Нажмите, чтобы скопировать">
                  <Tag
                    icon={<CopyOutlined />}
                    color="default"
                    style={{ cursor: 'pointer' }}
                    onClick={copyInviteCode}
                  >
                    Код: {course.inviteCode}
                  </Tag>
                </Tooltip>
              )}
            </div>
          </div>
          <Space wrap>
            {isTeacher && (
              <>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => navigate(`/course/${id}/new-post`)}
                >
                  Новый пост
                </Button>
                <Button
                  icon={<TeamOutlined />}
                  onClick={() => navigate(`/course/${id}/members`)}
                >
                  Участники
                </Button>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    editForm.setFieldsValue({ title: course.title });
                    setEditOpen(true);
                  }}
                >
                  Редактировать
                </Button>
              </>
            )}
            {!isAuthor && (
              <Popconfirm
                title="Вы уверены, что хотите покинуть курс?"
                onConfirm={handleLeave}
                okText="Да"
                cancelText="Нет"
              >
                <Button danger icon={<LogoutOutlined />}>
                  Покинуть
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>
      </Card>

      {/* Feed */}
      <Title level={4}>Лента курса</Title>

      {feedLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : feed.length === 0 ? (
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: 40 }}>
          <Text type="secondary">Пока нет записей</Text>
        </Card>
      ) : (
        <>
          <List
            dataSource={feed}
            renderItem={(item) => (
              <List.Item style={{ padding: 0, marginBottom: 12, border: 'none' }}>
                <Card
                  hoverable
                  style={{ width: '100%', borderRadius: 10 }}
                  onClick={() => navigate(`/post/${item.id}`, { state: { role: course.role } })}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background:
                          item.type === 'task' ? '#e8f0fe' : '#fce8e6',
                        color:
                          item.type === 'task' ? '#1967d2' : '#d93025',
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      {item.type === 'task' ? (
                        <CheckSquareOutlined />
                      ) : (
                        <FileTextOutlined />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ fontSize: 15 }}>
                        {item.title}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(item.createdDate).format('DD.MM.YYYY HH:mm')}
                      </Text>
                    </div>
                    <Tag color={item.type === 'task' ? 'blue' : 'default'}>
                      {item.type === 'task' ? 'Задание' : 'Пост'}
                    </Tag>
                    {isTeacher && item.type === 'task' && (
                      <Tooltip title="Решения">
                        <Button
                          type="text"
                          size="small"
                          icon={<BarChartOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/post/${item.id}/solutions`);
                          }}
                        />
                      </Tooltip>
                    )}
                  </div>
                </Card>
              </List.Item>
            )}
          />
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              onChange={handlePageChange}
              showSizeChanger={false}
            />
          </div>
        </>
      )}

      {/* Edit Modal */}
      <Modal
        title="Редактировать курс"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={null}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item
            name="title"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input size="large" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={editLoading}
            >
              Сохранить
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
