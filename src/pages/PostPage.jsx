// src/pages/PostPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Card,
  Tag,
  Button,
  Spin,
  Divider,
  Input,
  List,
  message,
  Popconfirm,
  Space,
  Upload,
  Descriptions,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  FileOutlined,
  SendOutlined,
  DownloadOutlined,
  MessageOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { postAPI, solutionAPI, commentAPI, filesAPI } from '../shared/api/endpoints';
import { useAuth } from '../shared/lib/authContext';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/* ──────── Comment component (recursive) ──────── */
function CommentItem({ comment, onRefreshParent }) {
  const { user } = useAuth();
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [submitting, setSubmitting] = useState(false);

  const loadReplies = async () => {
    try {
      const data = await commentAPI.getReplies(comment.id);
      setReplies(Array.isArray(data) ? data : []);
      setShowReplies(true);
    } catch (e) {
      message.error(e.message);
    }
  };

  const toggleReplies = () => {
    if (!showReplies && comment.nestedCount > 0) {
      loadReplies();
    } else {
      setShowReplies(!showReplies);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await commentAPI.reply(comment.id, replyText.trim());
      setReplyText('');
      setReplying(false);
      loadReplies();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editText.trim()) return;
    setSubmitting(true);
    try {
      await commentAPI.update(comment.id, editText.trim());
      comment.text = editText.trim();
      setEditing(false);
      message.success('Комментарий обновлён');
    } catch (e) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await commentAPI.delete(comment.id);
      message.success('Комментарий удалён');
      if (onRefreshParent) onRefreshParent();
    } catch (e) {
      message.error(e.message);
    }
  };

  const isOwn = user && comment.author && user.id === comment.author.id;

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          background: '#fafafa',
          borderRadius: 8,
          padding: '10px 14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <Text strong style={{ fontSize: 13 }}>
            {comment.author?.credentials || 'Пользователь'}
          </Text>
          {isOwn && !comment.isDeleted && (
            <Space size={4}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditing(true);
                  setEditText(comment.text);
                }}
              />
              <Popconfirm
                title="Удалить комментарий?"
                onConfirm={handleDelete}
                okText="Да"
                cancelText="Нет"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Space>
          )}
        </div>

        {editing ? (
          <div>
            <TextArea
              rows={2}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            <Space style={{ marginTop: 6 }}>
              <Button
                type="primary"
                size="small"
                loading={submitting}
                onClick={handleEdit}
              >
                Сохранить
              </Button>
              <Button size="small" onClick={() => setEditing(false)}>
                Отмена
              </Button>
            </Space>
          </div>
        ) : (
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {comment.text}
          </Paragraph>
        )}

        <div style={{ marginTop: 6, display: 'flex', gap: 12 }}>
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={() => setReplying(!replying)}
          >
            Ответить
          </Button>
          {comment.nestedCount > 0 && (
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              icon={showReplies ? <UpOutlined /> : <DownOutlined />}
              onClick={toggleReplies}
            >
              {showReplies ? 'Скрыть' : `Ответы (${comment.nestedCount})`}
            </Button>
          )}
        </div>
      </div>

      {replying && (
        <div style={{ marginLeft: 24, marginTop: 8 }}>
          <TextArea
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Ваш ответ..."
          />
          <Space style={{ marginTop: 6 }}>
            <Button
              type="primary"
              size="small"
              loading={submitting}
              onClick={handleReply}
            >
              Отправить
            </Button>
            <Button size="small" onClick={() => setReplying(false)}>
              Отмена
            </Button>
          </Space>
        </div>
      )}

      {showReplies && replies.length > 0 && (
        <div style={{ marginLeft: 24, marginTop: 8 }}>
          {replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              onRefreshParent={loadReplies}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────── Main PostPage ──────── */
export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  // Solution state (students)
  const [solution, setSolution] = useState(null);
  const [solText, setSolText] = useState('');
  const [solFiles, setSolFiles] = useState([]);
  const [solUploading, setSolUploading] = useState(false);
  const [solSubmitting, setSolSubmitting] = useState(false);

  // Solution comments state
  const [solutionComments, setSolutionComments] = useState([]);
  const [solCommentText, setSolCommentText] = useState('');
  const [solCommentLoading, setSolCommentLoading] = useState(false);

  // Comment state for post
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const fetchPost = useCallback(async () => {
    try {
      const data = await postAPI.getById(id);
      setPost(data);
    } catch (e) {
      message.error(e.message);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchComments = useCallback(async () => {
    try {
      const data = await commentAPI.getForPost(id);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    }
  }, [id]);

  const fetchSolution = useCallback(async () => {
    try {
      const data = await solutionAPI.getMine(id);
      setSolution(data);
    } catch {
      setSolution(null);
    }
  }, [id]);

  const fetchSolutionComments = useCallback(async () => {
    if (!solution) return;
    try {
      const data = await commentAPI.getForSolution(solution.id);
      setSolutionComments(Array.isArray(data) ? data : []);
    } catch {
      setSolutionComments([]);
    }
  }, [solution]);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [fetchPost, fetchComments]);

  // Fetch student solution if post is a task and user has userSolution
  useEffect(() => {
    if (post?.type === 'task') {
      fetchSolution();
    }
  }, [post, fetchSolution]);

  // Fetch solution comments when solution changes
  useEffect(() => {
    if (solution) {
      fetchSolutionComments();
    }
  }, [solution, fetchSolutionComments]);

  const handleDeletePost = async () => {
    try {
      await postAPI.delete(id);
      message.success('Запись удалена');
      navigate(-1);
    } catch (e) {
      message.error(e.message);
    }
  };

  /* ── Solution handlers ── */
  const handleUploadSolFile = async (file) => {
    setSolUploading(true);
    try {
      const data = await filesAPI.upload(file);
      setSolFiles((prev) => [...prev, { id: data.id, name: file.name }]);
    } catch (e) {
      message.error(e.message);
    } finally {
      setSolUploading(false);
    }
    return false; // prevent default upload
  };

  const handleSubmitSolution = async () => {
    setSolSubmitting(true);
    try {
      await solutionAPI.submit(id, {
        text: solText,
        files: solFiles.map((f) => f.id),
      });
      message.success('Решение отправлено');
      setSolText('');
      setSolFiles([]);
      fetchSolution();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSolSubmitting(false);
    }
  };

  const handleDeleteSolution = async () => {
    try {
      await solutionAPI.delete(id);
      message.success('Решение удалено');
      setSolution(null);
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleAddSolutionComment = async () => {
    if (!solCommentText.trim() || !solution) return;
    setSolCommentLoading(true);
    try {
      await commentAPI.addToSolution(solution.id, solCommentText.trim());
      setSolCommentText('');
      fetchSolutionComments();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSolCommentLoading(false);
    }
  };

  /* ── Comment handlers ── */
  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      await commentAPI.addToPost(id, commentText.trim());
      setCommentText('');
      fetchComments();
    } catch (e) {
      message.error(e.message);
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!post) return null;

  const statusLabels = {
    pending: { text: 'На проверке', color: 'processing' },
    checked: { text: 'Проверено', color: 'success' },
    returned: { text: 'Возвращено', color: 'warning' },
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16, fontSize: 15 }}
      >
        Назад
      </Button>

      {/* Post Card */}
      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 16,
          }}
        >
          <div>
            <Tag color={post.type === 'task' ? 'blue' : 'default'}>
              {post.type === 'task' ? 'Задание' : 'Пост'}
            </Tag>
            <Title level={3} style={{ margin: '8px 0 0' }}>
              {post.title}
            </Title>
          </div>
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/post/${id}/edit`)}
            >
              Редактировать
            </Button>
            <Popconfirm
              title="Удалить запись?"
              onConfirm={handleDeletePost}
              okText="Да"
              cancelText="Нет"
            >
              <Button danger icon={<DeleteOutlined />}>
                Удалить
              </Button>
            </Popconfirm>
          </Space>
        </div>

        <Paragraph style={{ fontSize: 15, whiteSpace: 'pre-wrap' }}>
          {post.text}
        </Paragraph>

        {/* Task details */}
        {post.type === 'task' && (
          <Descriptions
            bordered
            size="small"
            column={1}
            style={{ marginTop: 16 }}
          >
            {post.deadline && (
              <Descriptions.Item label="Дедлайн">
                <ClockCircleOutlined style={{ marginRight: 6 }} />
                {dayjs(post.deadline).format('DD.MM.YYYY HH:mm')}
              </Descriptions.Item>
            )}
            {post.maxScore != null && (
              <Descriptions.Item label="Макс. балл">
                {post.maxScore}
              </Descriptions.Item>
            )}
            {post.taskType && (
              <Descriptions.Item label="Тип">
                <Tag color={post.taskType === 'mandatory' ? 'red' : 'blue'}>
                  {post.taskType === 'mandatory'
                    ? 'Обязательное'
                    : 'Дополнительное'}
                </Tag>
              </Descriptions.Item>
            )}
            {post.solvableAfterDeadline != null && (
              <Descriptions.Item label="Сдача после дедлайна">
                {post.solvableAfterDeadline ? 'Да' : 'Нет'}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}

        {/* Post files */}
        {post.files && post.files.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong>Файлы:</Text>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {post.files.map((f) => (
                <a
                  key={f.id}
                  href={filesAPI.getUrl(f.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Tag icon={<FileOutlined />} color="blue" style={{ cursor: 'pointer' }}>
                    {f.name}
                  </Tag>
                </a>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Solution section for students */}
      {post.type === 'task' && (
        <Card
          title="Ваше решение"
          style={{ borderRadius: 12, marginBottom: 24 }}
        >
          {solution ? (
            <div>
              <div style={{ marginBottom: 12 }}>
                <Tag
                  color={statusLabels[solution.status]?.color || 'default'}
                >
                  {statusLabels[solution.status]?.text || solution.status}
                </Tag>
                {solution.score != null && (
                  <Tag color="green">
                    Оценка: {solution.score}/{post.maxScore}
                  </Tag>
                )}
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  {dayjs(solution.updatedDate).format('DD.MM.YYYY HH:mm')}
                </Text>
              </div>
              {solution.text && (
                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                  {solution.text}
                </Paragraph>
              )}
              {solution.files && solution.files.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {solution.files.map((f) => (
                    <a
                      key={f.id}
                      href={filesAPI.getUrl(f.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Tag icon={<DownloadOutlined />} color="blue">
                        {f.name}
                      </Tag>
                    </a>
                  ))}
                </div>
              )}
              <Popconfirm
                title="Удалить решение?"
                onConfirm={handleDeleteSolution}
                okText="Да"
                cancelText="Нет"
              >
                <Button danger size="small">
                  Удалить решение
                </Button>
              </Popconfirm>

              {/* Solution Comments */}
              <Divider />
              <div>
                <Title level={5}>
                  <MessageOutlined style={{ marginRight: 6 }} />
                  Комментарии к решению
                </Title>

                <div style={{ marginBottom: 12 }}>
                  <TextArea
                    rows={2}
                    value={solCommentText}
                    onChange={(e) => setSolCommentText(e.target.value)}
                    placeholder="Написать комментарий..."
                  />
                  <Button
                    type="primary"
                    size="small"
                    style={{ marginTop: 6 }}
                    loading={solCommentLoading}
                    onClick={handleAddSolutionComment}
                    icon={<SendOutlined />}
                  >
                    Отправить
                  </Button>
                </div>

                {solutionComments.length === 0 ? (
                  <Text type="secondary">Нет комментариев</Text>
                ) : (
                  solutionComments.map((c) => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      onRefreshParent={fetchSolutionComments}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div>
              <TextArea
                rows={3}
                value={solText}
                onChange={(e) => setSolText(e.target.value)}
                placeholder="Комментарий к решению..."
                style={{ marginBottom: 12 }}
              />
              <div style={{ marginBottom: 12 }}>
                <Upload
                  beforeUpload={handleUploadSolFile}
                  showUploadList={false}
                >
                  <Button loading={solUploading} icon={<FileOutlined />}>
                    Прикрепить файл
                  </Button>
                </Upload>
                {solFiles.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {solFiles.map((f) => (
                      <Tag
                        key={f.id}
                        closable
                        onClose={() =>
                          setSolFiles((prev) =>
                            prev.filter((x) => x.id !== f.id)
                          )
                        }
                      >
                        {f.name}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={solSubmitting}
                onClick={handleSubmitSolution}
              >
                Отправить решение
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Comments */}
      <Card
        title={
          <span>
            <MessageOutlined style={{ marginRight: 8 }} />
            Комментарии
          </span>
        }
        style={{ borderRadius: 12 }}
      >
        <div style={{ marginBottom: 16 }}>
          <TextArea
            rows={2}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Написать комментарий..."
          />
          <Button
            type="primary"
            size="small"
            style={{ marginTop: 8 }}
            loading={commentLoading}
            onClick={handleAddComment}
            icon={<SendOutlined />}
          >
            Отправить
          </Button>
        </div>

        {comments.length === 0 ? (
          <Text type="secondary">Пока нет комментариев</Text>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              onRefreshParent={fetchComments}
            />
          ))
        )}
      </Card>
    </div>
  );
}