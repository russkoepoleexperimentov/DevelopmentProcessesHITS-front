import React, { useState } from 'react';
import { Typography, Button, Space, Popconfirm, Input, message } from 'antd';
import { EditOutlined, DeleteOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { useAuth } from '../lib/authContext';
import { commentAPI } from '../api/endpoints';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function CommentItem({ comment, onRefreshParent }) {
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
      <div style={{ background: '#fafafa', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text strong style={{ fontSize: 13 }}>{comment.author?.credentials || 'Пользователь'}</Text>
          {isOwn && !comment.isDeleted && (
            <Space size={4}>
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditing(true); setEditText(comment.text); }} />
              <Popconfirm title="Удалить комментарий?" onConfirm={handleDelete} okText="Да" cancelText="Нет">
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )}
        </div>

        {editing ? (
          <div>
            <TextArea rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} />
            <Space style={{ marginTop: 6 }}>
              <Button type="primary" size="small" loading={submitting} onClick={handleEdit}>Сохранить</Button>
              <Button size="small" onClick={() => setEditing(false)}>Отмена</Button>
            </Space>
          </div>
        ) : (
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{comment.text}</Paragraph>
        )}

        <div style={{ marginTop: 6, display: 'flex', gap: 12 }}>
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setReplying(!replying)}>Ответить</Button>
          {comment.nestedCount > 0 && (
            <Button type="link" size="small" style={{ padding: 0 }} icon={showReplies ? <UpOutlined /> : <DownOutlined />} onClick={toggleReplies}>
              {showReplies ? 'Скрыть' : `Ответы (${comment.nestedCount})`}
            </Button>
          )}
        </div>
      </div>

      {replying && (
        <div style={{ marginLeft: 24, marginTop: 8 }}>
          <TextArea rows={2} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Ваш ответ..." />
          <Space style={{ marginTop: 6 }}>
            <Button type="primary" size="small" loading={submitting} onClick={handleReply}>Отправить</Button>
            <Button size="small" onClick={() => setReplying(false)}>Отмена</Button>
          </Space>
        </div>
      )}

      {showReplies && replies.length > 0 && (
        <div style={{ marginLeft: 24, marginTop: 8 }}>
          {replies.map((r) => (
            <CommentItem key={r.id} comment={r} onRefreshParent={loadReplies} />
          ))}
        </div>
      )}
    </div>
  );
}