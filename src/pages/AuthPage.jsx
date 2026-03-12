import React, { useState } from 'react';
import { Card, Tabs, Form, Input, Button, Typography, message } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { useAuth } from '../shared/lib/authContext';

const { Title, Text } = Typography;

export default function AuthPage() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);

  const onLogin = async (values) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('Добро пожаловать!');
    } catch (e) {
      message.error(e.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values) => {
    setLoading(true);
    try {
      await register(values.credentials, values.email, values.password);
      message.success('Регистрация прошла успешно!');
    } catch (e) {
      message.error(e.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 48px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 16,
        borderRadius: 32,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <BookOutlined
            style={{ fontSize: 48, color: '#1967d2', marginBottom: 8 }}
          />
          <Title level={3} style={{ margin: 0 }}>
            Classroom
          </Title>
          <Text type="secondary">Система обучения</Text>
        </div>

        <Tabs
          activeKey={tab}
          onChange={setTab}
          centered
          items={[
            {
              key: 'login',
              label: 'Вход',
              children: (
                <Form layout="vertical" onFinish={onLogin}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'Введите email' },
                      { type: 'email', message: 'Некорректный email' },
                    ]}
                  >
                    <Input size="large" placeholder="you@example.com" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label="Пароль"
                    rules={[{ required: true, message: 'Введите пароль' }]}
                  >
                    <Input.Password size="large" placeholder="Пароль" />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      size="large"
                      loading={loading}
                    >
                      Войти
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'register',
              label: 'Регистрация',
              children: (
                <Form layout="vertical" onFinish={onRegister}>
                  <Form.Item
                    name="credentials"
                    label="Имя"
                    rules={[{ required: true, message: 'Введите имя' }]}
                  >
                    <Input size="large" placeholder="Иван Иванов" />
                  </Form.Item>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'Введите email' },
                      { type: 'email', message: 'Некорректный email' },
                    ]}
                  >
                    <Input size="large" placeholder="you@example.com" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label="Пароль"
                    rules={[
                      { required: true, message: 'Введите пароль' },
                      { min: 6, message: 'Минимум 6 символов' },
                    ]}
                  >
                    <Input.Password size="large" placeholder="Пароль" />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      size="large"
                      loading={loading}
                    >
                      Зарегистрироваться
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
