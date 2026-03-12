# Спецификация API для системы обучения

# Структура ответа сервера

```json
{
    type: "string" // "success" | "error" - тип ответа (успех/ошибка)
    message: "string" // Строка сообщения (для отображения на UI) или null
    data: { ... } // данные ответа
}
```

Далее, под **ответом** понимается значение поле **data** в этой структуре. Например, при получении информации о себе (get)`/user`, в случае успеха, сервер пришлёт:

```json
{
    type: "success",
    message: null,
    data: {
      credentials: "foo",
      email: "example@mail.ru",
      id: "xxxxxxxxxxxxxxxxxxx"
    }
}
```

# Описание эндпоинтов

Символом `*` отмечены эндпоинты, для которых требуется авторизация (заголовок authorization). В системе используются JSON Web Token'ы (JWT)

В некоторых запросах есть пагинация формата skip-take (значения передаются через query-параметры).

* `skip` число от 0 до бесконечности - сколько записей пропустить

* `take` число от 1 до бесконечности - сколько записей взять после пропуска

* В ответе гарантированно будет: 
  
  * `records: [...]` - список записей по запросу (их количество не превышает значение take)
  
  * `totalRecords: int`- общее число записей в БД

# Регистрация и авторизация

## Регистрация `/auth/register` [post]

### Тело

```json
{
  credentials: "string",
  email: "string",
  password: "string"
}
```

### Ответ

```json
{
  accessToken: "string",
  refreshToken: "string"
}
```

## Вход `/auth/login` [post]

### Тело

```json
{
  email: "string",
  password: "string"
}
```

### Ответ

```json
{
  accessToken: "string",
  refreshToken: "string"
}
```

## [NEW] Выход* `/auth/logout` [post]

## Обновление токена* `/auth/refresh` [post]

### Ответ

```json
{
  accessToken: "string",
  refreshToken: "string"
}
```

# Пользователь

## [UPDATED] Получить данные о себе* `/users` [get]

### Ответ

```json
{
  credentials: "string",
  email: "string",
  id: "guid-string"
}
```

## [NEW] Получить данные о пользователе* `/users/{id}` [get]

### Ответ

```json
{
  credentials: "string",
  email: "string",
  id: "guid-string"
}
```

## [UPDATED] Обновить данные о себе* `/users` [put]

### Тело

```json
{
  credentials: "string"
  email: "string"
}
```

# Курс

## [UPDATED] Создать курс* `/course` [post]

### Тело

```json
{
  title: "string"
}
```

### Ответ

```json
{
   id: "guid-string",
   "title": "string"
}
```

## [NEW] Получить список курсов* /user/courses [get]

Возвращает все курсы, в которых состоит авторизованный пользователь, с указанием его роли в каждом курсе.

### Ответ

```json
{
  "records": [
    {
      "id": "guid-string",          // идентификатор курса
      "title": "string",            // название курса
      "role": "teacher" | "student" // роль пользователя в этом курсе
    },
    ...
  ]
}
```

## Изменить курс* `/course/{id}` [put]

Доступно только преподавателям

### Тело

```json
{
  title: "string"
}
```

### Ответ

```json
{
   id: "guid-string",
   title: "string"
}
```

## [UPDATED] Получить информацию о курсе* `/course/{id}` [get]

### Ответ

```json
{
   id: "guid-string",
   title: "string",
   role: "string", // роль авторизованного пользователя "teacher" | "student"
   authorId: "guid-string", // id создателя курса
   inviteCode: "string" // код приглашения в курс
}
```

## Получить посты курса* `/course/{id}/feed?skip={skip}&take={take}` [get]

### Ответ

```json
{
   records: [
    {
        id: "guid-string", // id поста
        type: "string", // "post" | "task"
        title: "string",
        createdDate: "datetime-iso-string",
    },
    ...
    ],
    totalRecords: int
}
```

## [UPDATED] Получить список участников курса* `/course/{id}/members?skip={skip}&take={take}&query={searchQuery}` [get]

Доступно только преподавателям курса.

### Ответ

```json
{
  records: [
    {
      id: "guid-string",
      credentials: "string",
      email: "string",
      role: "teacher" | "student"
    },
    ...
  ],
  totalRecords: int
}```
```

## Изменить роль участника* `/course/{id}/members/{userId}/role` [put]

Доступно только преподавателям курса. Преподаватель может повысить студента до 
преподавателя или понизить другого преподавателя до студента. Нельзя 
изменить роль самому себе.

### Тело

```json
{
  role: "teacher" | "student"
}
```

### Ответ

```json
{
  id: "guid-string", // user id
  role: "teacher" | "student"
}
```

## Удалить участника из курса* `/course/{id}/members/{userId}` [delete]

Доступно только преподавателям курса. Удаляет пользователя из курса (запись CourseRole). Нельзя удалить самого себя и создателя курса.

### Ответ

```json
{
  id: "guid-string", // course id
}
```

## [NEW] Покинуть курс* `/course/{id}/leave` [delete]

Покидание курса. Нельзя выйти только создателю курса

### Ответ

```json
{
  id: "guid-string", // course id
}
```

## Присоединиться к курсу по коду* `/course/join` [post]

Позволяет пользователю стать учеником курса, указав код приглашения. Код 
генерируется при создании курса автоматически. Посмотреть его можно, получив информацию о курсе.

### Тело

```json
{
  inviteCode: "string"
}
```

### Ответ

```json
{
  id: "guid-string", // course id
  title: "string",
  role: "student"
}
```

## Создать пост в курсе* `/course/{courseId}/task` [post]

Доступно только преподавателям курса.

### Тело

```json
{
  type: "string", // "post" | "task"
  title: "string",
  text: "string",
  deadline: "datetime-iso-string",      // опционально
  maxScore: int,                         // по умолчанию 5
  taskType: "mandatory" | "optional",    // обязательное/дополнительное
  solvableAfterDeadline: bool,            // можно ли сдавать после дедлайна
  files: ["guid-string", ...]  // опционально, ID ранее загруженных файлов
}
```

### Ответ

```json
{
  "id": "guid-string",
}
```

# Посты

## Получить пост* `/post/{id}` [get]

### Ответ

```json
{
  type: "string", // "post" | "task"
  title: "string",
  text: "string",

  // may be not null only for tasks:
  deadline: "datetime-iso-string" | null,      
  maxScore: int | null,                         
  taskType: "mandatory" | "optional" | null,    
  solvableAfterDeadline: bool | null,            
  files: [
    {
      id: "guid-string",
      name: "string",
    },
  ]  // опционально, ID ранее загруженных файлов
  userSolution: { ... } | null // решение пользователя
}
```

## Редактировать пост* `/post/{id}` [put]

Доступно только преподавателям курса.

### Тело

то же что и для создания поста

### Ответ

```json
{
  id: "guid-string",
}
```

## Удалить пост* `/post/{id}` [delete]

Доступно только преподавателям курса.

### Ответ:

```json
{
  id: "guid-string", // deleted post id
}
```

# Решение к заданиям

Далее под ID подразумевается id постов типа "задание", если не указано иное

## Отправить решение* `/task/{id}/solution` [put]

Только ученикам. Отправить или отредактировать существующее решение к заданию

### Тело

```json
{
  text: "string",                // комментарий к решению (опционально)
  files: ["guid-string", ...]  // ID файлов решения (можно несколько)
}
```

### Ответ

```json
{
  id: "guid-string", // solved task id
}
```

## Удалить решение* `/task/{id}/solution` [delete]

Только ученикам. Удалить существующее решение к заданию

### Ответ

```json
{
  id: "guid-string", // task id
}
```

## [UPDATED] Получить своё решение по заданию* `/task/{id}/solution` [get]

Только ученикам. 

### Ответ

```json
{
  text: "string",                // комментарий к решению (опционально)
  files: [
    {
      id: "guid-string",
      name: "string",
    },
  ]  // ID файлов решения (можно несколько)
  score: int | null,
  status: "pending" | "checked" | "returned",
  updatedDate": "datetime-iso-string"
}
```

## [UPDATED] Получить список решений по заданию* `/task/{id}/solutions?skip={skip}&take={take}&status=pending|checked|returned&studentId=...` [get]

Доступно только преподавателям курса. Фильтрация по статусу и конкретному ученику (опционально).

### Ответ

```json
{
  records: [
    {
      id: "guid-string", // id объекта решения (для следующего эндпоинта)
      user: {
        id: "guid-string",
        credentials: "string"
      },
      text: "string",
      score: int | null,
      status: "pending" | "checked" | "returned",
      files: [
        {
          id: "guid-string",
          name: "string",
        }
      ],
      updatedDate": "datetime-iso-string"
    },
    ...
  ],
  totalRecords: int
}
```

## Проверить решение (выставить оценку, изменить статус)* `/solution/{solutionId}/review` [post]

Доступно только преподавателям курса.

### Тело

```json
{
  score: int,                    // оценка (не более maxScore задания)
  status: "checked" | "returned", // "checked" — принято, "returned" — отклонено
  comment: "string"               // приватный комментарий к решению (опционально)
}
```

### Ответ

```json
{
    id: "guid-string", // solution id
}
```

# Комментарии

## Прокомментировать пост* `/post/{id}/comment` [post]

Создает ПУБЛИЧНЫЙ комментарий к посту курса

### Тело

```json
{
  text: "string"
}
```

### Ответ

```json
{
    id: "guid-string", // comment id
}
```

## Прокомментировать решение* `/solution/{id}/comment` [post]

Создает ПРИВАТНЫЙ комментарий к решению (ученик или преподаватель). Комментарии видит автор решения и преподаватели. Комментарий может создать только автор решения.

### Тело

```json
{
  text: "string"
}
```

### Ответ

```json
{
    id: "guid-string", // comment id
}
```

## Получить root-комментарии к посту* `/post/{id}/comment` [get]

### Ответ

```json
[
    {
        id: "guid-string", // comment id
        text: "string",
        author: {
            id: "guid-string",
            credentials: "guid-string"
        },
        nestedCount: int // кол-во вложенных комментариев
    },
    ...
]
```

## Получить root-комментарии к решению* `/solution/{id}/comment` [get]

### Ответ такой же как выше

## Получить ответы на комментарий* `/comment/{id}/replies`[get]

Возвращает комментарии которые являются ответом на данный

### Ответ такой же как выше

## Ответить на комментарий* `/comment/{id}/reply`[post]

### Тело

```json
{
  text: "string"
}
```

### Ответ

```json
{
    id: "guid-string", // comment id
}
```

## Редактировать комментарий* `/comment/{id}`[put]

### Тело

```json
{
  text: "string"
}
```

### Ответ

```json
{
    id: "guid-string", // comment id
}
```

## Удалить комментарий* `/comment/{id}`[delete]

### Ответ

```json
{
    id: "guid-string", // comment id
}
```

# [NEW] Файлы

## Загрузить* /files/upload [post]

### Тело

multipart/form-data
файл передавать в поле "file"

### Ответ

```json
{
  "id": "guid-string"
}
```

## Получить файл* /files/{id} [get]

### Ответ

В случае успеха сервер возвращает файл с соответствующим Content-Type. Тело ответа — бинарные данные файла.

При ошибке доступа или отсутствии файла возвращается стандартный JSON-ответ с type: "error".

- Важно: в случае успеха данный эндпоинт возвращает не JSON, а отдаёт файл напрямую.
