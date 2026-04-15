import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  Input,
  Upload,
  Tag,
  message,
  Spin,
  Alert,
  Divider,
  Space,
} from 'antd';
import {
  SendOutlined,
  FileOutlined,
  UploadOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { teamTaskAPI, filesAPI, teamAPI } from '../shared/api/endpoints';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function TeamSolution() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [team, setTeam] = useState(null);
  const [task, setTask] = useState(null);
  const [solution, setSolution] = useState(null);
  const [solutionText, setSolutionText] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isCaptain, setIsCaptain] = useState(false);

  useEffect(() => {
    loadData();
  }, [taskId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const teamData = await teamTaskAPI.getMyTeam(taskId);
      setTeam(teamData);
      
      const captainStatus = await teamAPI.isCaptain(teamData.id);
      setIsCaptain(captainStatus);
      
      const postData = await teamTaskAPI.getTaskDetails?.(taskId) || { title: 'Групповое задание' };
      setTask(postData);
      
      try {
        const solutionData = await teamTaskAPI.getMySolution(taskId);
        setSolution(solutionData);
        if (solutionData.text) {
          setSolutionText(solutionData.text);
        }
        if (solutionData.files) {
          setFiles(solutionData.files);
        }
      } catch (error) {
        console.log('Решение ещё не отправлено');
      }
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const data = await filesAPI.upload(file);
      setFiles((prev) => [...prev, { id: data.id, name: file.name }]);
      message.success('Файл загружен');
    } catch (error) {
      message.error(error.message);
    } finally {
      setUploading(false);
    }
    return false;
  };

  const removeFile = (fileId) => {
    setFiles(files.filter(f => f.id !== fileId));
  };

  const handleSubmit = async () => {
    if (!solutionText.trim() && files.length === 0) {
      message.warning('Добавьте текст или файлы');
      return;
    }
    
    setSubmitting(true);
    try {
      await teamTaskAPI.submitSolution(taskId, {
        text: solutionText,
        files: files.map(f => f.id),
      });
      message.success('Решение отправлено на проверку');
      await loadData();
      navigate(`/team/${taskId}/distribution`);
    } catch (error) {
      message.error(error.message);
    } finally {
      setSubmitting(false);
    }
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
      case 'returned': return 'Возвращено на доработку';
      default: return 'Черновик';
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
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card style={{ borderRadius: 12 }}>
        <Title level={3}>Командное решение</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          Отправьте решение от имени всей команды
        </Text>

        <div style={{ marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tag icon={<TeamOutlined />} color="blue">Команда: {team?.name || 'Без названия'}</Tag>
          <Tag color={getStatusColor(solution?.status)}>
            {getStatusText(solution?.status)}
          </Tag>
          {solution?.score !== undefined && (
            <Tag color="green">Оценка: {solution.score}</Tag>
          )}
        </div>

        {!isCaptain && solution?.status !== 'returned' && (
          <Alert
            message="Только капитан может отправлять решение"
            description="Попросите капитана команды отправить решение на проверку."
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {solution?.status === 'checked' && (
          <Alert
            message="Решение проверено"
            description={`Ваше решение получило оценку ${solution.score}. Отличная работа!`}
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {solution?.status === 'returned' && (
          <Alert
            message="Решение возвращено на доработку"
            description="Преподаватель оставил комментарии. Внесите правки и отправьте снова."
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Divider />

        <div style={{ marginBottom: 24 }}>
          <Text strong>Ваше решение</Text>
          <TextArea
            rows={6}
            value={solutionText}
            onChange={(e) => setSolutionText(e.target.value)}
            placeholder="Опишите решение команды..."
            disabled={!isCaptain && solution?.status !== 'returned'}
            style={{ marginTop: 8 }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <Text strong>Прикреплённые файлы</Text>
          <div style={{ marginTop: 8 }}>
            <Upload beforeUpload={handleUpload} showUploadList={false} disabled={!isCaptain && solution?.status !== 'returned'}>
              <Button icon={<UploadOutlined />} loading={uploading} disabled={!isCaptain && solution?.status !== 'returned'}>
                Загрузить файл
              </Button>
            </Upload>
            <div style={{ marginTop: 12 }}>
              {files.map((file) => (
                <Tag
                  key={file.id}
                  closable={isCaptain || solution?.status === 'returned'}
                  onClose={() => removeFile(file.id)}
                  icon={<FileOutlined />}
                  style={{ marginBottom: 8 }}
                >
                  {file.name}
                </Tag>
              ))}
            </div>
          </div>
        </div>

        {(isCaptain || solution?.status === 'returned') && (
          <Button
            type="primary"
            icon={<SendOutlined />}
            size="large"
            block
            loading={submitting}
            onClick={handleSubmit}
          >
            {solution?.status === 'returned' ? 'Отправить исправленное решение' : 'Отправить на проверку'}
          </Button>
        )}

        <Divider />

        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          <Button onClick={() => navigate(-1)}>Назад</Button>
        </div>
      </Card>
    </div>
  );
}