import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Modal,
  Input,
  Form,
  Typography,
  Spin,
  Empty,
  Tag,
  message,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  LoginOutlined,
  BookOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { courseAPI } from '../shared/api/endpoints';

const { Title, Text } = Typography;

const COLORS = [
  '#1967d2',
  '#137333',
  '#e8710a',
  '#a142f4',
  '#d93025',
  '#1a73e8',
  '#188038',
  '#f29900',
  '#8430ce',
  '#c5221f',
];

const getColor = (id) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [createForm] = Form.useForm();
  const [joinForm] = Form.useForm();

  const fetchCourses = async () => {
    try {
      const data = await courseAPI.myCourses();
      setCourses(data.records || []);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreate = async (values) => {
    setFormLoading(true);
    try {
      await courseAPI.create({ title: values.title });
      message.success('Курс создан');
      setCreateOpen(false);
      createForm.resetFields();
      fetchCourses();
    } catch (e) {
      message.error(e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleJoin = async (values) => {
    setFormLoading(true);
    try {
      await courseAPI.join(values.inviteCode);
      message.success('Вы присоединились к курсу');
      setJoinOpen(false);
      joinForm.resetFields();
      fetchCourses();
    } catch (e) {
      message.error(e.message);
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Мои курсы
        </Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip title="Присоединиться к курсу">
            <Button icon={<LoginOutlined />} onClick={() => setJoinOpen(true)}>
              Присоединиться
            </Button>
          </Tooltip>
          <Tooltip title="Создать новый курс">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              Создать курс
            </Button>
          </Tooltip>
        </div>
      </div>

      {courses.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="У вас пока нет курсов"
        />
      ) : (
        <Row gutter={[16, 16]}>
          {courses.map((course) => {
            const color = getColor(course.id);
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={course.id}>
                <Card
                  hoverable
                  onClick={() => navigate(`/course/${course.id}`)}
                  style={{ borderRadius: 12, overflow: 'hidden', height: '100%' }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div
                    style={{
                      background: color,
                      padding: '24px 16px 16px',
                      minHeight: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Tooltip title={course.title} placement="topLeft">
                      <Title
                        level={4}
                        style={{
                          color: '#fff',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {course.title}
                      </Title>
                    </Tooltip>
                  </div>
                  <div
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Tag
                      color={course.role === 'teacher' ? 'blue' : 'green'}
                      icon={
                        course.role === 'teacher' ? (
                          <BookOutlined />
                        ) : (
                          <UserOutlined />
                        )
                      }
                    >
                      {course.role === 'teacher' ? 'Преподаватель' : 'Студент'}
                    </Tag>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Create Course Modal */}
      <Modal
        title="Создать курс"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        footer={null}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="title"
            label="Название курса"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input size="large" placeholder="Математический анализ" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={formLoading}
            >
              Создать
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Join Course Modal */}
      <Modal
        title="Присоединиться к курсу"
        open={joinOpen}
        onCancel={() => {
          setJoinOpen(false);
          joinForm.resetFields();
        }}
        footer={null}
      >
        <Form form={joinForm} layout="vertical" onFinish={handleJoin}>
          <Form.Item
            name="inviteCode"
            label="Код приглашения"
            rules={[{ required: true, message: 'Введите код' }]}
          >
            <Input size="large" placeholder="Введите код приглашения" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={formLoading}
            >
              Присоединиться
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
