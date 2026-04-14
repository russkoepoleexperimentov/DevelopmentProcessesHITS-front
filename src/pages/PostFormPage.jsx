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
import { UploadOutlined, FileOutlined, UserAddOutlined } from '@ant-design/icons';
import { courseAPI, postAPI, filesAPI, teamTaskAPI } from '../shared/api/endpoints';
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
  const [members, setMembers] = useState([]);
  const [memberName, setMemberName] = useState('');
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
          });
          setPostType(data.type);
          if (data.files && data.files.length > 0) {
            setFiles(data.files);
          }
          if (data.members) {
            setMembers(data.members);
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

  const addMember = () => {
    if (!memberName.trim()) return;
    if (members.includes(memberName.trim())) {
      message.warning('Участник уже добавлен');
      return;
    }
    setMembers([...members, memberName.trim()]);
    setMemberName('');
  };

  const removeMember = (index) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleSubmit = async (values) => {
    if (values.type === 'teaM_TASK' && members.length === 0) {
      message.warning('Добавьте хотя бы одного участника в команду');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
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
        body.deadline = values.deadline ? values.deadline.toISOString() : undefined;
        body.maxScore = values.maxScore ?? 100;
        body.minTeamSize = values.minTeamSize || 2;
        body.maxTeamSize = values.maxTeamSize || members.length;
        body.captainMode = values.captainMode || 'votingAndLottery';
        body.votingDurationHours = values.votingDurationHours || 24;
        body.teacherCreatesTeams = false;
        body.allowJoinTeam = true;
        body.allowLeaveTeam = true;
        body.allowStudentTransferCaptain = true;
      }

      if (isEdit) {
        await postAPI.update(postId, body);
        message.success('Запись обновлена');
        navigate(`/post/${postId}`);
      } else {
        const res = await courseAPI.createPost(courseId, body);
        message.success('Запись создана');
        
        if (values.type === 'teaM_TASK' && members.length > 0) {
          // Сохраняем участников в localStorage для следующих шагов
          localStorage.setItem('currentTaskMembers', JSON.stringify(members));
          localStorage.setItem('currentTaskId', res.id);
          localStorage.setItem('currentTaskTitle', values.title);
          
          // Перенаправляем на страницу распределения
          navigate(`/team/${res.id}/distribution`);
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
              <Form.Item name="deadline" label="Дедлайн">
                <DatePicker showTime size="large" style={{ width: '100%' }} format="DD.MM.YYYY HH:mm" />
              </Form.Item>
              <Form.Item name="maxScore" label="Максимальный балл">
                <InputNumber size="large" min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="captainMode" label="Выбор капитана">
                <Select options={[
                  { value: 'firstMember', label: 'Первый вступивший' },
                  { value: 'teacherFixed', label: 'Назначает учитель' },
                  { value: 'votingAndLottery', label: 'Голосование' },
                ]} />
              </Form.Item>
              <Form.Item name="votingDurationHours" label="Длительность голосования (часов)">
                <InputNumber min={1} max={168} style={{ width: '100%' }} />
              </Form.Item>

              <Divider>Участники команды</Divider>
              <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
                <Input placeholder="Имя участника" value={memberName} onChange={(e) => setMemberName(e.target.value)} onPressEnter={addMember} />
                <Button type="primary" icon={<UserAddOutlined />} onClick={addMember}>Добавить</Button>
              </Space.Compact>
              <div style={{ marginBottom: 24 }}>
                {members.map((member, index) => (
                  <Tag key={index} closable onClose={() => removeMember(index)} style={{ marginBottom: 8, padding: '4px 8px' }}>
                    👤 {member}
                  </Tag>
                ))}
                {members.length === 0 && <span style={{ color: '#999' }}>Участники не добавлены</span>}
              </div>
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