import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  InputNumber,
  Switch,
  Upload,
  Tag,
  Typography,
  Spin,
  message,
} from 'antd';
import { UploadOutlined, FileOutlined } from '@ant-design/icons';
import { courseAPI, postAPI, filesAPI } from '../shared/api/endpoints';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

export default function PostFormPage() {
  const { courseId, postId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postType, setPostType] = useState('post');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const isEdit = Boolean(postId);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      postAPI
        .getById(postId)
        .then((data) => {
          form.setFieldsValue({
            type: data.type,
            title: data.title,
            text: data.text,
            deadline: data.deadline ? dayjs(data.deadline) : null,
            maxScore: data.maxScore,
            taskType: data.taskType,
            solvableAfterDeadline: data.solvableAfterDeadline ?? false,
          });
          setPostType(data.type);
          if (data.files && data.files.length > 0) {
            setFiles(data.files);
          }
        })
        .catch((e) => {
          message.error(e.message);
          navigate(-1);
        })
        .finally(() => setLoading(false));
    }
  }, [isEdit, postId, form, navigate]);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const data = await filesAPI.upload(file);
      setFiles((prev) => [...prev, { id: data.id, name: file.name }]);
    } catch (e) {
      message.error(e.message);
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const body = {
        type: values.type,
        title: values.title,
        text: values.text || '',
        files: files.map((f) => f.id),
      };

      if (values.type === 'task') {
        body.deadline = values.deadline
          ? values.deadline.toISOString()
          : undefined;
        body.maxScore = values.maxScore ?? 5;
        body.taskType = values.taskType || 'mandatory';
        body.solvableAfterDeadline = values.solvableAfterDeadline ?? false;
      }

      if (isEdit) {
        await postAPI.update(postId, body);
        message.success('Запись обновлена');
        navigate(`/post/${postId}`);
      } else {
        const res = await courseAPI.createPost(courseId, body);
        message.success('Запись создана');
        navigate(`/post/${res.id}`);
      }
    } catch (e) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
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
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Title level={3}>{isEdit ? 'Редактировать запись' : 'Новая запись'}</Title>

      <Card style={{ borderRadius: 12 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            type: 'post',
            maxScore: 5,
            taskType: 'mandatory',
            solvableAfterDeadline: false,
          }}
        >
          <Form.Item
            name="type"
            label="Тип"
            rules={[{ required: true }]}
          >
            <Select
              size="large"
              onChange={(v) => setPostType(v)}
              options={[
                { value: 'post', label: 'Пост' },
                { value: 'task', label: 'Задание' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="title"
            label="Заголовок"
            rules={[{ required: true, message: 'Введите заголовок' }]}
          >
            <Input size="large" placeholder="Заголовок" />
          </Form.Item>

          <Form.Item name="text" label="Текст">
            <TextArea rows={5} placeholder="Содержание..." />
          </Form.Item>

          {postType === 'task' && (
            <>
              <Form.Item name="deadline" label="Дедлайн">
                <DatePicker
                  showTime
                  size="large"
                  style={{ width: '100%' }}
                  format="DD.MM.YYYY HH:mm"
                  placeholder="Выберите дату и время"
                />
              </Form.Item>

              <Form.Item name="maxScore" label="Максимальный балл">
                <InputNumber
                  size="large"
                  min={1}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item name="taskType" label="Тип задания">
                <Select
                  size="large"
                  options={[
                    { value: 'mandatory', label: 'Обязательное' },
                    { value: 'optional', label: 'Дополнительное' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="solvableAfterDeadline"
                label="Можно сдавать после дедлайна"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </>
          )}

          {/* Files */}
          <Form.Item label="Файлы">
            <Upload beforeUpload={handleUpload} showUploadList={false}>
              <Button icon={<UploadOutlined />} loading={uploading}>
                Загрузить файл
              </Button>
            </Upload>
            {files.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4,
                }}
              >
                {files.map((f) => (
                  <Tag
                    key={f.id}
                    icon={<FileOutlined />}
                    closable
                    onClose={() =>
                      setFiles((prev) => prev.filter((x) => x.id !== f.id))
                    }
                  >
                    {f.name}
                  </Tag>
                ))}
              </div>
            )}
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={submitting}
            >
              {isEdit ? 'Сохранить' : 'Создать'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
