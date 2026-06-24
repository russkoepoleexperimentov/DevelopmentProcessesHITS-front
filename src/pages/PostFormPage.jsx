import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { convertFrontendToBackend } from '../shared/utils/convertCriteria';
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
  Row,
  Col,
  Collapse,
  Space,
  Tooltip,
} from 'antd';
import { UploadOutlined, FileOutlined, SettingOutlined, TeamOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { courseAPI, postAPI, filesAPI } from '../shared/api/endpoints';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;
const TEAM_TASK_TYPE = 'teaM_TASK';

export default function PostFormPage() {
  const { courseId, postId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postType, setPostType] = useState('post');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [criteriaConfigured, setCriteriaConfigured] = useState(false);
  const [savedCriteria, setSavedCriteria] = useState(null);
  const [isTeamTask, setIsTeamTask] = useState(false);
  const isEdit = Boolean(postId);
  
  const watchCopyGroups = Form.useWatch('copyGroupsFromPreviousAssignment', form);
  const watchGradingMode = Form.useWatch('gradingMode', form);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      postAPI
        .getById(postId)
        .then((data) => {
          const isLoadedTeamTask =
            data.type === TEAM_TASK_TYPE ||
            Boolean(data.minTeamSize || data.maxTeamSize || data.captainMode);
          form.setFieldsValue({
            type: data.type === TEAM_TASK_TYPE ? 'task' : data.type,
            title: data.title,
            text: data.text,
            deadline: data.deadline ? dayjs(data.deadline) : null,
            maxScore: data.maxScore,
            taskType: data.taskType,
            solvableAfterDeadline: data.solvableAfterDeadline ?? false,
            // Командные поля
            minTeamSize: data.minTeamSize,
            maxTeamSize: data.maxTeamSize,
            captainMode: data.captainMode === 'votingAndLottery' ? 'votingAndLottery' : 'firstMember',
            votingDurationHours: data.votingDurationHours,
            predefinedTeamsCount: data.predefinedTeamsCount,
            allowJoinTeam: data.allowJoinTeam ?? true,
            allowLeaveTeam: data.allowLeaveTeam ?? true,
            allowStudentTransferCaptain: data.allowStudentTransferCaptain ?? true,
            copyGroupsFromPreviousAssignment: data.copyGroupsFromPreviousAssignment ?? false,
            sourceAssignmentId: data.sourceAssignmentId,
            // Вес самооценки
            studentScoreWeight: data.studentScoreWeight ?? 0,
            gradingMode: data.gradingMode?.toLowerCase() === 'peertopeer' ? 'PeerToPeer' : 'TeacherReview',
            minPeerReviewsRequired: data.minPeerReviewsRequired ?? null,
          });
          setPostType(data.type === TEAM_TASK_TYPE ? 'task' : data.type);
          // Проверяем, командное ли задание
          if (isLoadedTeamTask) {
            setIsTeamTask(true);
          }
          if (data.files && data.files.length > 0) {
            setFiles(data.files);
          }
          if (data.criteria && data.criteria.length > 0) {
            setCriteriaConfigured(true);
            setSavedCriteria(data.criteria);
          }
        })
        .catch((e) => {
          message.error(e.message);
          navigate(-1);
        })
        .finally(() => setLoading(false));
    }

    if (!isEdit) {
      const savedConfig = sessionStorage.getItem('tempCriteriaConfig');
      if (savedConfig) {
        setCriteriaConfigured(true);
        setSavedCriteria(JSON.parse(savedConfig));
      }
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
        type: values.type === 'task' && isTeamTask ? TEAM_TASK_TYPE : values.type,
        title: values.title,
        text: values.text || '',
        files: files.map((f) => f.id),
      };

      if (values.type === 'task') {
        body.deadline = values.deadline ? values.deadline.toISOString() : undefined;
        body.maxScore = values.maxScore ?? 5;
        body.taskType = values.taskType || 'mandatory';
        body.solvableAfterDeadline = values.solvableAfterDeadline ?? false;
        
        body.studentScoreWeight = values.studentScoreWeight ?? 0;
        body.gradingMode = values.gradingMode ?? 'TeacherReview';
        if (!isTeamTask && values.gradingMode === 'PeerToPeer') {
          body.minPeerReviewsRequired = values.minPeerReviewsRequired;
        }
        
        // Командные поля (только если включен командный режим)
        if (isTeamTask) {
          if (values.minTeamSize) body.minTeamSize = values.minTeamSize;
          if (values.maxTeamSize) body.maxTeamSize = values.maxTeamSize;
          const captainMode = values.captainMode === 'votingAndLottery' ? 'votingAndLottery' : 'firstMember';
          body.captainMode = captainMode;
          if (values.votingDurationHours) body.votingDurationHours = values.votingDurationHours;
          if (values.predefinedTeamsCount) body.predefinedTeamsCount = values.predefinedTeamsCount;
          body.allowJoinTeam = values.allowJoinTeam ?? true;
          body.allowLeaveTeam = values.allowLeaveTeam ?? true;
          body.allowStudentTransferCaptain = values.allowStudentTransferCaptain ?? true;
          body.copyGroupsFromPreviousAssignment = values.copyGroupsFromPreviousAssignment ?? false;
          if (values.copyGroupsFromPreviousAssignment && values.sourceAssignmentId) {
            body.sourceAssignmentId = values.sourceAssignmentId;
          }
        }
        
        // Критерии оценивания
        let criteriaToSend = null;
        
        if (isEdit && savedCriteria) {
          criteriaToSend = savedCriteria;
        } else if (!isEdit) {
          const savedConfig = sessionStorage.getItem('tempCriteriaConfig');
          if (savedConfig) {
            const frontendConfig = JSON.parse(savedConfig);
            criteriaToSend = convertFrontendToBackend(frontendConfig, body.maxScore);
            sessionStorage.removeItem('tempCriteriaConfig');
          }
        }
        
        if (criteriaToSend && criteriaToSend.length > 0) {
          body.criteria = criteriaToSend;
        }
      }

      if (isEdit) {
        await postAPI.update(postId, body);
        message.success('Запись обновлена');
        navigate(body.type === TEAM_TASK_TYPE ? `/team/${postId}` : `/post/${postId}`);
      } else {
        const res = await courseAPI.createPost(courseId, body);
        message.success('Запись создана');
        navigate(body.type === TEAM_TASK_TYPE ? `/team/${res.id}` : `/post/${res.id}`);
      }
    } catch (e) {
      console.error('Submit error:', e);
      message.error(e.message || 'Ошибка при сохранении');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfigureCriteria = () => {
    if (postId) {
      navigate(`/course/${courseId}/task/${postId}/criteria`);
    } else {
      navigate(`/course/${courseId}/task/new/criteria`);
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
            allowJoinTeam: true,
            allowLeaveTeam: true,
            allowStudentTransferCaptain: true,
            captainMode: 'firstMember',
            votingDurationHours: 24,
            copyGroupsFromPreviousAssignment: false,
            studentScoreWeight: 0,
            gradingMode: 'TeacherReview',
          }}
        >
          <Form.Item name="type" label="Тип" rules={[{ required: true }]}>
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
                <InputNumber size="large" min={1} style={{ width: '100%' }} />
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

              <Form.Item name="gradingMode" label="Режим оценивания">
                <Select
                  size="large"
                  options={[
                    { value: 'TeacherReview', label: '👨‍🏫 Преподаватель' },
                    { value: 'PeerToPeer', label: '👥 P2P (взаимное оценивание)' },
                  ]}
                />
              </Form.Item>

              {!isTeamTask && watchGradingMode === 'PeerToPeer' && (
                <Form.Item
                  name="minPeerReviewsRequired"
                  label="Минимум оцениваний для зачёта"
                  rules={[
                    { required: true, message: 'Укажите минимум' },
                    { type: 'number', min: 1, message: 'Должно быть >= 1' },
                  ]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} placeholder="Например: 2" />
                </Form.Item>
              )}

              <Divider />

              {/* Кнопка включения командного режима */}
              <Form.Item label="Тип выполнения">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type={!isTeamTask ? 'primary' : 'default'}
                    onClick={() => setIsTeamTask(false)}
                    block
                  >
                    👤 Индивидуальное задание
                  </Button>
                  <Button 
                    type={isTeamTask ? 'primary' : 'default'}
                    onClick={() => setIsTeamTask(true)}
                    icon={<TeamOutlined />}
                    block
                  >
                    👥 Командное задание
                  </Button>
                </Space>
              </Form.Item>

              {/* Командные настройки (показываются только при включенном командном режиме) */}
              {isTeamTask && (
                <Collapse style={{ marginBottom: 16 }} defaultActiveKey={['team']}>
                  <Panel header="⚙️ Настройки командной работы" key="team">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="minTeamSize" label="Мин. размер команды" tooltip="Минимальное количество участников">
                          <InputNumber min={1} max={20} style={{ width: '100%' }} placeholder="Не использовать" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="maxTeamSize" label="Макс. размер команды" tooltip="Максимальное количество участников">
                          <InputNumber min={1} max={20} style={{ width: '100%' }} placeholder="Не использовать" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name="captainMode" label="Режим выбора капитана">
                      <Select
                        size="large"
                        options={[
                          { value: 'firstMember', label: 'Первый участник становится капитаном' },
                          { value: 'votingAndLottery', label: 'Голосование и жеребьёвка' },
                        ]}
                        placeholder="Выберите способ"
                      />
                    </Form.Item>

                    <Form.Item name="votingDurationHours" label="Длительность голосования (часы)">
                      <InputNumber min={1} max={168} style={{ width: '100%' }} placeholder="24" />
                    </Form.Item>

                    <Form.Item name="predefinedTeamsCount" label="Количество команд">
                      <InputNumber min={1} max={50} style={{ width: '100%' }} placeholder="Автоматически" />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item name="allowJoinTeam" label="Вступление в команду" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="allowLeaveTeam" label="Выход из команды" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="allowStudentTransferCaptain" label="Смена капитана" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name="copyGroupsFromPreviousAssignment" label="Скопировать группы из предыдущего задания" valuePropName="checked">
                      <Switch />
                    </Form.Item>

                    {watchCopyGroups && (
                      <Form.Item name="sourceAssignmentId" label="ID предыдущего задания">
                        <Input placeholder="UUID предыдущего задания" />
                      </Form.Item>
                    )}
                  </Panel>
                </Collapse>
              )}

              <Divider />

              {/* Вес самооценки - НОВЫЙ БЛОК */}
              <Form.Item
                name="studentScoreWeight"
                label={
                  <span>
                    Вес самооценки (0..1)
                    <Tooltip title="Если установить 0, студенты не будут видеть форму самооценки и она не будет влиять на итоговую оценку">
                      <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
                    </Tooltip>
                  </span>
                }
              >
                <InputNumber
                  min={0}
                  max={1}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="0 - самооценка отключена"
                />
              </Form.Item>

              {/* Критерии оценивания */}
              <Form.Item label="📊 Критерии оценивания">
                <Button
                  icon={<SettingOutlined />}
                  onClick={handleConfigureCriteria}
                  type={criteriaConfigured ? 'primary' : 'default'}
                  style={{ width: '100%' }}
                >
                  {criteriaConfigured 
                    ? '✏️ Редактировать критерии оценивания' 
                    : '⚙️ Настроить критерии оценивания'}
                </Button>
                {criteriaConfigured && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                    ✓ Критерии настроены
                  </div>
                )}
              </Form.Item>
            </>
          )}

          {/* Файлы */}
          <Form.Item label="📎 Файлы">
            <Upload beforeUpload={handleUpload} showUploadList={false}>
              <Button icon={<UploadOutlined />} loading={uploading}>
                Загрузить файл
              </Button>
            </Upload>
            {files.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {files.map((f) => (
                  <Tag
                    key={f.id}
                    icon={<FileOutlined />}
                    closable
                    onClose={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                  >
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