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
  Popconfirm,
} from 'antd';
import {
  SendOutlined,
  FileOutlined,
  UploadOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  RollbackOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { teamTaskAPI, filesAPI, teamAPI } from '../shared/api/endpoints';
import { useAuth } from '../shared/lib/authContext';
import { convertBackendToFrontend } from '../shared/utils/convertCriteria';
import SelfAssessmentForm from '../components/SelfAssessmentForm';

const { Title, Text } = Typography;
const { TextArea } = Input;
const normalizeCaptainMode = (mode) => mode === 'votingAndLottery' ? 'votingAndLottery' : 'firstMember';

export default function TeamSolution() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingSelfAssessment, setSavingSelfAssessment] = useState(false);
  const [team, setTeam] = useState(null);
  const [task, setTask] = useState(null);
  const [solution, setSolution] = useState(null);
  const [criteriaConfig, setCriteriaConfig] = useState(null);
  const [selfAssessment, setSelfAssessment] = useState(null);
  const [solutionText, setSolutionText] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isCaptain, setIsCaptain] = useState(false);

  useEffect(() => {
    loadData();
  }, [taskId]);

  const getMemberId = (member) => member?.userId || member?.id || member?.studentId;
  const idsEqual = (left, right) => left != null && right != null && String(left) === String(right);

  const loadData = async () => {
    setLoading(true);
    try {
      let teamData;
      try {
        teamData = await teamTaskAPI.getMyTeam(taskId);
      } catch (error) {
        setTeam(null);
        setSolution(null);
        setIsCaptain(false);
        return;
      }
      setTeam(teamData);

      const postData = await teamTaskAPI.getTaskDetails?.(taskId) || { title: 'Групповое задание' };
      setTask(postData);
      if (postData.criteria?.length > 0) {
        setCriteriaConfig(convertBackendToFrontend(postData.criteria));
      } else if (postData.weightedCriteria || postData.bonusPenalties) {
        setCriteriaConfig(postData);
      } else {
        setCriteriaConfig(null);
      }

      const captainStatus = await teamAPI.isCaptain(teamData.id);
      const firstMemberCaptain =
        normalizeCaptainMode(postData.captainMode) === 'firstMember' &&
        idsEqual(getMemberId(teamData.members?.[0]), user?.id);
      setIsCaptain(captainStatus || firstMemberCaptain);
      
      try {
        const solutionData = await teamTaskAPI.getMySolution(taskId);
        setSolution(solutionData);
        if (solutionData.text) {
          setSolutionText(solutionData.text);
        }
        if (solutionData.files) {
          setFiles(solutionData.files);
        }
        const myAssessment = solutionData.selfAssessments?.find(sa => sa.userId === user?.id);
        setSelfAssessment(
          myAssessment?.evaluation ||
          solutionData.selfAssessment?.evaluation ||
          solutionData.selfAssessment ||
          null
        );
      } catch (error) {
        console.log('Решение ещё не отправлено');
        setSelfAssessment(null);
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
    } catch (error) {
      message.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSolution = async () => {
    setSubmitting(true);
    try {
      await teamTaskAPI.deleteSolution(taskId);
      message.success('Решение отозвано');
      setSolution(null);
      setSolutionText('');
      setFiles([]);
      await loadData();
    } catch (error) {
      message.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSelfAssessment = async () => {
    if (!solution) {
      message.warning('Сначала должно быть отправлено командное решение');
      return;
    }

    if (!selfAssessment) {
      message.warning('Заполните самооценку перед сохранением');
      return;
    }

    setSavingSelfAssessment(true);
    try {
      await teamTaskAPI.submitSelfAssessment(taskId, selfAssessment);
      message.success('Самооценка сохранена');
      await loadData();
    } catch (error) {
      message.error(error.message);
    } finally {
      setSavingSelfAssessment(false);
    }
  };

  const handleContinueToDistribution = () => {
    navigate(`/team/${taskId}/distribution`);
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

  const renderSelfAssessmentSection = (readOnly = false) => {
    if (!solution || !criteriaConfig) return null;

    return (
      <>
        <Divider />
        <Title level={4}>Самооценка по критериям</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Каждый участник команды заполняет свою самооценку отдельно.
        </Text>

        {solution.selfAssessments?.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {solution.selfAssessments.map((item) => (
              <Tag key={item.userId} color={item.evaluation ? 'green' : 'default'}>
                {item.credentials || 'Участник'}
              </Tag>
            ))}
          </div>
        )}

        <SelfAssessmentForm
          assignmentConfig={criteriaConfig}
          initialAssessment={selfAssessment}
          onChange={setSelfAssessment}
          readOnly={readOnly}
        />

        {!readOnly && (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={savingSelfAssessment}
            onClick={handleSaveSelfAssessment}
            style={{ marginTop: 16 }}
            block
          >
            Сохранить самооценку
          </Button>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!team) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <Alert
          type="warning"
          showIcon
          message="Вы ещё не в команде"
          description="Чтобы работать над командным решением, сначала выберите или создайте команду."
          action={
            <Button type="primary" onClick={() => navigate(`/team/${taskId}/select`)}>
              Перейти к командам
            </Button>
          }
        />
      </div>
    );
  }

  // Решение уже проверено и оценено
  if (solution?.status === 'checked') {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Card style={{ borderRadius: 12 }}>
          <Title level={3}>Командное решение</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Решение проверено и оценено
          </Text>

          <Alert
            message="Решение проверено"
            description={`Ваше решение получило оценку ${solution.score}. Отличная работа!`}
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 24 }}
          />

          <Divider />

          <div style={{ marginBottom: 24 }}>
            <Text strong>Ваше решение:</Text>
            <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
              <Text>{solutionText || 'Текст решения'}</Text>
            </div>
          </div>

          {files.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <Text strong>Файлы:</Text>
              <div style={{ marginTop: 8 }}>
                {files.map((file) => (
                  <Tag key={file.id} icon={<FileOutlined />} color="blue">
                    {file.name}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {renderSelfAssessmentSection(true)}

          <Button
            type="primary"
            size="large"
            block
            onClick={handleContinueToDistribution}
            style={{ marginBottom: 16 }}
          >
            Перейти к распределению баллов
          </Button>

          <Button onClick={() => navigate(-1)}>Назад</Button>
        </Card>
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
          {solution && (
            <Tag color={getStatusColor(solution.status)}>
              {getStatusText(solution.status)}
            </Tag>
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

        {solution?.status === 'returned' && (
          <Alert
            message="Решение возвращено на доработку"
            description="Преподаватель оставил комментарии. Внесите правки и отправьте снова."
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {solution?.status === 'pending' && (
          <Alert
            message="Решение на проверке"
            description="Ваше решение отправлено на проверку учителю. Дождитесь оценки."
            type="info"
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
            disabled={!isCaptain || solution?.status === 'pending'}
            style={{ marginTop: 8 }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <Text strong>Прикреплённые файлы</Text>
          <div style={{ marginTop: 8 }}>
            <Upload 
              beforeUpload={handleUpload} 
              showUploadList={false} 
              disabled={!isCaptain || solution?.status === 'pending'}
            >
              <Button 
                icon={<UploadOutlined />} 
                loading={uploading} 
                disabled={!isCaptain || solution?.status === 'pending'}
              >
                Загрузить файл
              </Button>
            </Upload>
            <div style={{ marginTop: 12 }}>
              {files.map((file) => (
                <Tag
                  key={file.id}
                  closable={isCaptain && solution?.status !== 'pending' && solution?.status !== 'checked'}
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

        {renderSelfAssessmentSection(solution?.status === 'checked')}

        <Space direction="vertical" style={{ width: '100%' }}>
          {isCaptain && solution?.status !== 'pending' && solution?.status !== 'checked' && (
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

          {isCaptain && solution?.status === 'pending' && (
            <Popconfirm
              title="Отозвать решение?"
              description="Вы уверены, что хотите отозвать решение? Учитель ещё не проверил его."
              onConfirm={handleDeleteSolution}
              okText="Да, отозвать"
              cancelText="Нет"
            >
              <Button
                danger
                icon={<RollbackOutlined />}
                size="large"
                block
                loading={submitting}
              >
                Отозвать решение
              </Button>
            </Popconfirm>
          )}
        </Space>

        <Divider />

        <Button onClick={() => navigate(-1)}>Назад</Button>
      </Card>
    </div>
  );
}
