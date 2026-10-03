import { useEffect, useRef, useState } from 'react';
import { data, Form, Link, redirect, useFetcher, useNavigate, useNavigation } from 'react-router';
import { ArrowLeft, CheckCircle2, MessageCircle, Pencil, ThumbsUp, Trash2 } from 'lucide-react';
import {
  excerpt,
  type CommentDto,
  type CommunityDto,
  type OpeningDto,
  type Page,
  type PostDto,
  type PostSummaryDto,
  type ProjectMemberDto,
} from '@fricadev/shared';
import type { Route } from './+types/post';
import { Markdown } from '~/components/markdown';
import { AuthorLine, TagList } from '~/components/post-card';
import { PostTypeBadge } from '~/components/post-type-badge';
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  FormError,
  PageContainer,
  StatusMark,
} from '~/components/ui';
import { MarkdownEditor } from '~/components/markdown-editor';
import { ReportButton } from '~/components/report-button';
import { OpeningsCard, TeamCard, TeamManagePanel } from '~/components/team-section';
import {
  AboutCard,
  CommunitySideCard,
  SidebarBlock,
  SimilarPosts,
} from '~/components/post-sidebar';
import { PostReactions } from '~/components/post-reactions';
import { ShareButton } from '~/components/share-button';
import { ApiError, createApi } from '~/lib/api.server';
import { apiErrorToActionData, splitList, type FieldErrors } from '~/lib/forms.server';
import { renderMarkdown } from '~/lib/markdown.server';

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: 'Publication introuvable · FricaDev' }];
  return [
    { title: `${loaderData.post.title} · FricaDev` },
    { name: 'description', content: excerpt(loaderData.post.body, 160) },
    { property: 'og:title', content: loaderData.post.title },
    { property: 'og:type', content: 'article' },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const api = await createApi(request);
  try {
    const [post, comments] = await Promise.all([
      api.call<PostDto>(`/v1/posts/${params.id}`),
      api.call<CommentDto[]>(`/v1/posts/${params.id}/comments`),
    ]);
    const isProject = post.type === 'PROJECT';
    const similarQuery = new URLSearchParams({ type: post.type, limit: '4' });
    if (post.tags[0]) similarQuery.set('tag', post.tags[0]);
    const [openings, members, similar, community, postHtml, ...commentHtml] = await Promise.all([
      isProject ? api.call<OpeningDto[]>(`/v1/posts/${post.id}/openings`) : Promise.resolve([]),
      isProject
        ? api.call<ProjectMemberDto[]>(`/v1/posts/${post.id}/members`)
        : Promise.resolve([]),
      // Colonne de droite : un échec ici ne doit jamais empêcher d'afficher la publication.
      api
        .call<Page<PostSummaryDto>>(`/v1/posts?${similarQuery}`)
        .then((page) => page.items.filter((p) => p.id !== post.id).slice(0, 3))
        .catch(() => [] as PostSummaryDto[]),
      post.community
        ? api.call<CommunityDto>(`/v1/communities/${post.community.slug}`).catch(() => null)
        : Promise.resolve(null),
      renderMarkdown(post.body),
      ...comments.map((c) => renderMarkdown(c.body)),
    ]);
    return data(
      {
        post,
        postHtml,
        comments: comments.map((c, i) => ({ ...c, html: commentHtml[i] ?? '' })),
        openings: openings as OpeningDto[],
        members: members as ProjectMemberDto[],
        similar,
        community,
        canInteract: Boolean(api.profile),
        isAuthenticated: api.isAuthenticated(),
      },
      { headers: await api.headers() },
    );
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      throw data('Publication introuvable', { status: 404 });
    }
    throw error;
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const api = await createApi(request);
  if (!api.isAuthenticated()) {
    throw redirect(`/auth/login?returnTo=/p/${params.id}`);
  }
  if (!api.profile) throw redirect(`/onboarding?returnTo=/p/${params.id}`);

  const form = await request.formData();
  const intent = form.get('intent');
  const on = form.get('on') === '1';
  const success = async (done: string) =>
    data(
      {
        ok: true as boolean,
        intent: done as string | null,
        error: null as string | null,
        fieldErrors: {} as FieldErrors,
      },
      { headers: await api.headers() },
    );
  try {
    switch (intent) {
      case 'react':
        await api.call(`/v1/posts/${params.id}/reactions/${form.get('type')}`, {
          method: on ? 'PUT' : 'DELETE',
        });
        break;
      case 'answer':
        await api.call(`/v1/posts/${params.id}/comments`, {
          method: 'POST',
          body: { body: String(form.get('body') ?? '') },
        });
        return success('answer');
      case 'accept':
        await api.call(`/v1/comments/${form.get('commentId')}/accept`, { method: 'POST' });
        break;
      case 'vote':
        await api.call(`/v1/comments/${form.get('commentId')}/useful`, {
          method: on ? 'PUT' : 'DELETE',
        });
        break;
      case 'edit-comment':
        await api.call(`/v1/comments/${form.get('commentId')}`, {
          method: 'PATCH',
          body: { body: String(form.get('body') ?? '') },
        });
        break;
      case 'delete-comment':
        await api.call(`/v1/comments/${form.get('commentId')}`, { method: 'DELETE' });
        break;
      case 'delete-post':
        await api.call(`/v1/posts/${params.id}`, { method: 'DELETE' });
        return redirect('/', { headers: await api.headers() });
      case 'create-opening':
        await api.call(`/v1/posts/${params.id}/openings`, {
          method: 'POST',
          body: {
            role: String(form.get('role') ?? ''),
            description: String(form.get('description') ?? ''),
            skills: splitList(form.get('skills')),
            commitment: form.get('commitment'),
            remote: form.get('remote') === 'on',
          },
        });
        break;
      case 'toggle-opening':
        await api.call(`/v1/openings/${form.get('openingId')}`, {
          method: 'PATCH',
          body: { status: form.get('status') },
        });
        break;
      case 'apply':
        await api.call(`/v1/openings/${form.get('openingId')}/applications`, {
          method: 'POST',
          body: { message: String(form.get('message') ?? '') },
        });
        break;
      case 'withdraw':
        await api.call(`/v1/applications/${form.get('applicationId')}`, { method: 'DELETE' });
        break;
      case 'decide':
        await api.call(`/v1/applications/${form.get('applicationId')}/decision`, {
          method: 'POST',
          body: { decision: form.get('decision') },
        });
        break;
      case 'report':
        await api.call('/v1/moderation/reports', {
          method: 'POST',
          body: {
            targetType: form.get('targetType'),
            targetId: form.get('targetId'),
            reason: form.get('reason'),
            details: String(form.get('details') ?? '') || undefined,
          },
        });
        break;
      default:
        throw data('Action inconnue', { status: 400 });
    }
    return success(String(intent));
  } catch (error) {
    return apiErrorToActionData(error, await api.headers(), String(intent));
  }
}

function DeleteButton({ intent, commentId }: { intent: string; commentId?: string }) {
  return (
    <Form
      method="post"
      onSubmit={(event) => {
        if (!confirm('Supprimer définitivement ce contenu ?')) event.preventDefault();
      }}
    >
      <input type="hidden" name="intent" value={intent} />
      {commentId && <input type="hidden" name="commentId" value={commentId} />}
      <Button
        variant="ghost"
        size="sm"
        icon={<Trash2 size={14} aria-hidden />}
        className="text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Supprimer
      </Button>
    </Form>
  );
}

function Answer({
  comment,
  canAccept,
  canInteract,
}: {
  comment: CommentDto & { html: string };
  canAccept: boolean;
  canInteract: boolean;
}) {
  const fetcher = useFetcher();
  const voted = fetcher.formData
    ? fetcher.formData.get('on') === '1'
    : Boolean(comment.viewer?.votedUseful);
  const count = comment.usefulCount + (voted ? 1 : 0) - (comment.viewer?.votedUseful ? 1 : 0);
  const isOwn = comment.viewer?.isAuthor ?? false;
  const canModerate = comment.viewer?.canModerate ?? false;
  const [editing, setEditing] = useState(false);
  const editor = useFetcher<{ ok: boolean }>();

  useEffect(() => {
    if (editor.state === 'idle' && editor.data?.ok) setEditing(false);
  }, [editor.state, editor.data]);

  return (
    <Card
      as="article"
      id={`r-${comment.id}`}
      className={comment.isAccepted ? 'border-brand-600/60 ring-4 ring-brand-600/10' : ''}
    >
      {comment.isAccepted && (
        <StatusMark tone="success" icon={<CheckCircle2 size={15} aria-hidden />} className="mb-3">
          Meilleure réponse
        </StatusMark>
      )}
      <AuthorLine
        author={comment.author}
        createdAt={comment.createdAt}
        edited={Boolean(comment.editedAt)}
        size={32}
      />

      {editing ? (
        <editor.Form method="post" className="mt-4 space-y-3">
          <input type="hidden" name="intent" value="edit-comment" />
          <input type="hidden" name="commentId" value={comment.id} />
          <MarkdownEditor
            name="body"
            id={`edit-${comment.id}`}
            defaultValue={comment.body}
            rows={6}
            required
            minLength={2}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Annuler
            </Button>
            <Button size="sm" loading={editor.state !== 'idle'}>
              Enregistrer
            </Button>
          </div>
        </editor.Form>
      ) : (
        <Markdown html={comment.html} className="mt-4" />
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="vote" />
          <input type="hidden" name="commentId" value={comment.id} />
          <input type="hidden" name="on" value={voted ? '0' : '1'} />
          <Button
            variant="secondary"
            size="sm"
            disabled={!canInteract || isOwn}
            aria-pressed={voted}
            title={isOwn ? 'C’est ta réponse' : undefined}
            icon={<ThumbsUp size={14} className={voted ? 'fill-current' : ''} aria-hidden />}
            className={voted ? 'border-brand-600 text-brand-600' : ''}
          >
            Utile · <span className="tabular-nums">{count}</span>
          </Button>
        </fetcher.Form>
        {canAccept && !comment.isAccepted && (
          <Form method="post">
            <input type="hidden" name="intent" value="accept" />
            <input type="hidden" name="commentId" value={comment.id} />
            <Button variant="secondary" size="sm" icon={<CheckCircle2 size={14} aria-hidden />}>
              Accepter
            </Button>
          </Form>
        )}
        <span className="ml-auto flex items-center gap-1">
          {isOwn && !editing && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setEditing(true)}
              icon={<Pencil size={14} aria-hidden />}
            >
              Modifier
            </Button>
          )}
          {(isOwn || canModerate) && (
            <DeleteButton intent="delete-comment" commentId={comment.id} />
          )}
          {canInteract && !isOwn && <ReportButton targetType="COMMENT" targetId={comment.id} />}
        </span>
      </footer>
    </Card>
  );
}

export default function PostPage({ loaderData, actionData }: Route.ComponentProps) {
  const { post, postHtml, comments, canInteract, isAuthenticated } = loaderData;
  const isAuthor = post.viewer?.isAuthor ?? false;
  const canModerate = post.viewer?.canModerate ?? false;
  const reactions = post.viewer?.reactions ?? [];
  const isQuestion = post.type === 'QUESTION';
  const navigation = useNavigation();
  const answering =
    navigation.state === 'submitting' && navigation.formData?.get('intent') === 'answer';
  const answerForm = useRef<HTMLFormElement>(null);
  const [answerKey, setAnswerKey] = useState(0);

  useEffect(() => {
    if (actionData?.ok && actionData.intent === 'answer') {
      answerForm.current?.reset();
      setAnswerKey((k) => k + 1); // vide aussi l'éditeur Markdown
    }
  }, [actionData]);

  const isProject = post.type === 'PROJECT';
  const navigate = useNavigate();

  return (
    <PageContainer size="xl">
      {/*
        Deux colonnes sur grand écran (publication + discussion à gauche, blocs à droite) ;
        sur mobile, l'ordre naturel : publication, blocs (équipe, postes), discussion.
      */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_1fr]">
        <Card as="article" padding="lg" className="lg:col-start-1 lg:row-start-1">
          <header className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
              aria-label="Retour"
              className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200 hover:text-stone-900 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-white"
            >
              <ArrowLeft size={18} aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <AuthorLine
                author={post.author}
                createdAt={post.createdAt}
                edited={Boolean(post.editedAt)}
                size={40}
                extra={
                  post.community ? (
                    <>
                      {' · '}
                      <Link
                        to={`/c/${post.community.slug}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {post.community.name}
                      </Link>
                    </>
                  ) : null
                }
              />
            </div>
            <PostTypeBadge type={post.type} />
          </header>

          <h1 className="mt-5 text-2xl font-semibold leading-tight tracking-tight sm:text-[28px]">
            {post.title}
          </h1>
          <Markdown html={postHtml} className="mt-5" />

          <div className="mt-6">
            <TagList tags={post.tags} size="md" />
          </div>

          <footer className="mt-6 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
            <PostReactions
              postId={post.id}
              likeCount={post.likeCount}
              usefulCount={post.usefulCount}
              viewerReactions={canInteract ? reactions : null}
              isOwn={isAuthor}
              size="md"
            />
            <a
              href="#reponses"
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium tabular-nums text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-white"
            >
              <MessageCircle size={15} aria-hidden /> {post.commentCount}
            </a>
            <span className="ml-auto flex items-center gap-1">
              <ShareButton title={post.title} />
              {isAuthor && (
                <ButtonLink
                  to={`/p/${post.id}/edit`}
                  variant="ghost"
                  size="sm"
                  icon={<Pencil size={14} aria-hidden />}
                >
                  Modifier
                </ButtonLink>
              )}
              {(isAuthor || canModerate) && <DeleteButton intent="delete-post" />}
              {canInteract && !isAuthor && <ReportButton targetType="POST" targetId={post.id} />}
            </span>
          </footer>
          {actionData?.error && actionData.intent !== 'answer' && (
            <div className="mt-3">
              <FormError>{actionData.error}</FormError>
            </div>
          )}
        </Card>

        <aside
          aria-label="À propos de cette publication"
          className="space-y-4 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pb-2 [scrollbar-width:thin]"
        >
          {isProject && (
            <>
              <SidebarBlock title="L’équipe" count={loaderData.members.length + 1}>
                <TeamCard owner={post.author} members={loaderData.members} />
              </SidebarBlock>
              <SidebarBlock
                title="Postes ouverts"
                count={loaderData.openings.filter((o) => o.status === 'OPEN').length}
              >
                <OpeningsCard
                  postId={post.id}
                  openings={loaderData.openings}
                  isOwner={isAuthor}
                  canInteract={canInteract}
                />
              </SidebarBlock>
            </>
          )}
          <AboutCard
            post={post}
            memberCount={isProject ? loaderData.members.length + 1 : undefined}
          />
          {loaderData.community && (
            <CommunitySideCard community={loaderData.community} hasProfile={canInteract} />
          )}
          <SimilarPosts type={post.type} posts={loaderData.similar} />
        </aside>

        <div className="min-w-0 space-y-10 lg:col-start-1 lg:row-start-2">
          {isProject && isAuthor && <TeamManagePanel openings={loaderData.openings} />}

          <section id="reponses" className="scroll-mt-24" aria-labelledby="answers-title">
            <h2 id="answers-title" className="text-lg font-semibold tracking-tight">
              {comments.length === 0
                ? isQuestion
                  ? 'Pas encore de réponse'
                  : 'Pas encore de commentaire'
                : `${comments.length} ${isQuestion ? 'réponse' : 'commentaire'}${comments.length > 1 ? 's' : ''}`}
            </h2>
            {isQuestion && comments.length === 0 && (
              <p className="mt-1 text-sm text-stone-500">Sois la première personne à aider.</p>
            )}

            <div className="mt-4 space-y-4">
              {comments.map((comment) => (
                <Answer
                  key={comment.id}
                  comment={comment}
                  canInteract={canInteract}
                  canAccept={isAuthor && isQuestion}
                />
              ))}
            </div>

            <div className="mt-8">
              {canInteract ? (
                <Card padding="lg">
                  <Form method="post" ref={answerForm} className="space-y-4">
                    <input type="hidden" name="intent" value="answer" />
                    <MarkdownEditor
                      key={answerKey}
                      name="body"
                      id="answer"
                      label={isQuestion ? 'Ta réponse' : 'Ton commentaire'}
                      required
                      minLength={2}
                      rows={6}
                      placeholder="Explique ta solution. Les blocs de code sont colorés."
                      error={
                        actionData?.intent === 'answer'
                          ? (actionData.error ?? undefined)
                          : undefined
                      }
                    />
                    <div className="flex justify-end">
                      <Button loading={answering}>
                        {isQuestion ? 'Publier ma réponse' : 'Commenter'}
                      </Button>
                    </div>
                  </Form>
                </Card>
              ) : (
                <EmptyState
                  icon={<MessageCircle size={22} aria-hidden />}
                  title={isQuestion ? 'Tu connais la réponse ?' : 'Envie de réagir ?'}
                  description={
                    isAuthenticated
                      ? 'Crée ton profil pour participer.'
                      : 'Connecte-toi pour participer à la discussion.'
                  }
                  action={
                    <ButtonLink
                      to={
                        isAuthenticated
                          ? `/onboarding?returnTo=/p/${post.id}`
                          : `/auth/login?returnTo=/p/${post.id}`
                      }
                    >
                      {isAuthenticated ? 'Créer mon profil' : 'Se connecter'}
                    </ButtonLink>
                  }
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
