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
  Divider,
  Space,
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
            minTeamSize: data.minTeamSize || 2,
            maxTeamSize: data.maxTeamSize || 5,
            captainMode: data.captainMode || 'votingAndLottery',
            votingDurationHours: data.votingDurationHours || 24,
            predefinedTeamsCount: data.predefinedTeamsCount || 2,
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
      let body = {
        type: values.type,
        title: values.title,
        text: values.text || '',
        files: files.map((f) => f.id),
      };

      if (values.type === 'task') {
        body.deadline = values.deadline ? values.deadline.toISOString() : undefined;
        body.maxScore = values.maxScore ?? 5;
        body.taskType = values.taskType || 'mandatory';
        body.solvableAfterDeadline = values.solvableAfterDeadline ?? false;
      }

      if (values.type === 'teaM_TASK') {
        body = {
          type: 'teaM_TASK',
          title: values.title,
          text: values.text || '',
          files: files.map(f => f.id),
          minTeamSize: values.minTeamSize || 2,
          maxTeamSize: values.maxTeamSize || 5,
          captainMode: values.captainMode || 'votingAndLottery',
          votingDurationHours: values.votingDurationHours || 24,
          predefinedTeamsCount: values.predefinedTeamsCount || 2,
          allowJoinTeam: true,
          allowLeaveTeam: true,
          allowStudentTransferCaptain: true,
        };
      }

      if (isEdit) {
        await postAPI.update(postId, body);
        message.success('Запись обновлена');
        navigate(`/post/${postId}`);
      } else {
        const res = await courseAPI.createPost(courseId, body);
        message.success('Запись создана');
        
        if (values.type === 'teaM_TASK') {
          localStorage.setItem('currentTaskId', res.id);
          localStorage.setItem('currentTaskTitle', values.title);
          localStorage.setItem('predefinedTeamsCount', values.predefinedTeamsCount || 2);
          localStorage.setItem('currentCourseId', courseId);
          
          navigate(`/team/${res.id}/select`);
        } else {
          navigate(`/post/${res.id}`);
        }
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
            minTeamSize: 2,
            maxTeamSize: 5,
            captainMode: 'votingAndLottery',
            votingDurationHours: 24,
            predefinedTeamsCount: 2,
          }}
        >
          <Form.Item name="type" label="Тип" rules={[{ required: true }]}>
            <Select
              size="large"
              onChange={(v) => setPostType(v)}
              options={[
                { value: 'post', label: 'Пост' },
                { value: 'task', label: 'Индивидуальное задание' },
                { value: 'teaM_TASK', label: '👥 Групповое задание' },
              ]}
            />
          </Form.Item>

          <Form.Item name="title" label="Заголовок" rules={[{ required: true, message: 'Введите заголовок' }]}>
            <Input size="large" placeholder="Заголовок" />
          </Form.Item>

          <Form.Item name="text" label="Текст">
            <TextArea rows={5} placeholder="Содержание..." />
          </Form.Item>

          {postType === 'task' && (
            <>
              <Form.Item name="deadline" label="Дедлайн">
                <DatePicker showTime size="large" style={{ width: '100%' }} format="DD.MM.YYYY HH:mm" />
              </Form.Item>
              <Form.Item name="maxScore" label="Максимальный балл">
                <InputNumber size="large" min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="taskType" label="Тип задания">
                <Select options={[{ value: 'mandatory', label: 'Обязательное' }, { value: 'optional', label: 'Дополнительное' }]} />
              </Form.Item>
              <Form.Item name="solvableAfterDeadline" label="Можно сдавать после дедлайна" valuePropName="checked">
                <Switch />
              </Form.Item>
            </>
          )}

          {postType === 'teaM_TASK' && (
            <>
              <Form.Item name="minTeamSize" label="Минимальный размер команды">
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="maxTeamSize" label="Максимальный размер команды">
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="captainMode" label="Выбор капитана">
                <Select options={[
                  { value: 'firstMember', label: 'Первый вступивший' },
                  { value: 'teacherFixed', label: 'Назначает учитель' },
                  { value: 'votingAndLottery', label: 'Голосование' },
                ]} />
              </Form.Item>
              <Form.Item name="votingDurationHours" label="Длительность голосования" tooltip="Как долго будет длиться голосование за капитана">
                <Select
                  style={{ width: '100%' }}
                  options={[
                    { value: 1, label: '⏱️ 1 минута (для теста)' },
                    { value: 5, label: '⏱️ 5 минут (для теста)' },
                    { value: 10, label: '⏱️ 10 минут (для теста)' },
                    { value: 30, label: '⏱️ 30 минут' },
                    { value: 60, label: '⏱️ 1 час' },
                    { value: 24, label: '📅 1 день' },
                    { value: 48, label: '📅 2 дня' },
                    { value: 72, label: '📅 3 дня' },
                    { value: 168, label: '📅 7 дней' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="predefinedTeamsCount" label="Количество команд" tooltip="Сколько команд будет создано для этого задания">
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}

          <Form.Item label="Файлы">
            <Upload beforeUpload={handleUpload} showUploadList={false}>
              <Button icon={<UploadOutlined />} loading={uploading}>Загрузить файл</Button>
            </Upload>
            {files.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {files.map((f) => (
                  <Tag key={f.id} icon={<FileOutlined />} closable onClose={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}>
                    {f.name}
                  </Tag>
                ))}
              </div>
            )}
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
              {isEdit ? 'Сохранить' : 'Создать'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}