import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
import { usersAPI } from '../shared/api/endpoints';
import { useAuth } from '../shared/lib/authContext';

const { Title } = Typography;

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await usersAPI.update({
        credentials: values.credentials,
        email: values.email,
      });
      updateUser({ credentials: values.credentials, email: values.email });
      message.success('Профиль обновлён');
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <Title level={3}>Профиль</Title>

      <Card style={{ borderRadius: 12 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            credentials: user.credentials,
            email: user.email,
          }}
        >
          <Form.Item
            name="credentials"
            label="Имя"
            rules={[{ required: true, message: 'Введите имя' }]}
          >
            <Input
              size="large"
              prefix={<UserOutlined />}
              placeholder="Иван Иванов"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input
              size="large"
              prefix={<MailOutlined />}
              placeholder="you@example.com"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
            >
              Сохранить
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
