import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Card,
  Table,
  Tag,
  Button,
  Input,
  Space,
  Popconfirm,
  message,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  SwapOutlined,
  DeleteOutlined,
  SearchOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { courseAPI } from '../shared/api/endpoints';
import { useAuth } from '../shared/lib/authContext';

const { Title } = Typography;

export default function MembersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);

  const pageSize = 20;

  const fetchCourse = useCallback(async () => {
    try {
      const data = await courseAPI.getById(id);
      setCourse(data);
    } catch (e) {
      message.error(e.message);
      navigate('/');
    }
  }, [id, navigate]);

  const fetchMembers = useCallback(
    async (p = 1, q = '') => {
      setLoading(true);
      try {
        const data = await courseAPI.getMembers(
          id,
          (p - 1) * pageSize,
          pageSize,
          q
        );
        setMembers(data.records || []);
        setTotal(data.totalRecords || 0);
      } catch (e) {
        message.error(e.message);
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchCourse();
    fetchMembers(1, '');
  }, [fetchCourse, fetchMembers]);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
    fetchMembers(1, value);
  };

  const handlePageChange = (p) => {
    setPage(p);
    fetchMembers(p, search);
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await courseAPI.changeMemberRole(id, userId, newRole);
      message.success('Роль изменена');
      fetchMembers(page, search);
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleRemove = async (userId) => {
    try {
      await courseAPI.removeMember(id, userId);
      message.success('Участник удалён');
      fetchMembers(page, search);
    } catch (e) {
      message.error(e.message);
    }
  };

  const columns = [
    {
      title: 'Имя',
      dataIndex: 'credentials',
      key: 'credentials',
      render: (text, record) => (
        <Space>
          {text}
          {course && record.id === course.authorId && (
            <CrownOutlined style={{ color: '#faad14' }} title="Создатель" />
          )}
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'teacher' ? 'blue' : 'green'}>
          {role === 'teacher' ? 'Преподаватель' : 'Студент'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => {
        const isMe = user && record.id === user.id;
        const isAuthor = course && record.id === course.authorId;
        if (isMe || isAuthor) return null;

        return (
          <Space>
            <Popconfirm
              title={`Сменить роль на ${record.role === 'teacher' ? 'студент' : 'преподаватель'}?`}
              onConfirm={() =>
                handleChangeRole(
                  record.id,
                  record.role === 'teacher' ? 'student' : 'teacher'
                )
              }
              okText="Да"
              cancelText="Нет"
            >
              <Button
                size="small"
                icon={<SwapOutlined />}
                title="Сменить роль"
              >
                {record.role === 'teacher' ? 'Понизить' : 'Повысить'}
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Удалить участника из курса?"
              onConfirm={() => handleRemove(record.id)}
              okText="Да"
              cancelText="Нет"
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                title="Удалить"
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/course/${id}`)}
        />
        <Title level={3} style={{ margin: 0 }}>
          Участники курса
        </Title>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <div style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Поиск участников..."
            onSearch={handleSearch}
            enterButton={<SearchOutlined />}
            size="large"
            allowClear
          />
        </div>

        <Table
          columns={columns}
          dataSource={members}
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
    </div>
  );
}
