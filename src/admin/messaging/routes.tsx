import { Campaign } from './Campaign';
import { ComposeMessage } from './ComposeMessage';
import { MessageHistory } from './MessageHistory';
import { MessagesLog } from './MessagesLog';
import { Templates } from './TemplatesPage';

export { Campaign, ComposeMessage, MessageHistory, MessagesLog, Templates };
export type { ComposeMessageProps } from './ComposeMessage';
export type { MessageHistoryProps } from './MessageHistory';
export type { Attachment, MessageCategory, MessageChannel, MessageContext, Recipient } from './types';
export { buildVars, fillTemplate } from './templates';

// Mount inside <Routes>: {messagingRoutes.map((r) => <Route key={r.path} {...r} />)}
export const messagingRoutes = [
  { path: '/messages', element: <MessagesLog /> },
  { path: '/messages/send', element: <Campaign /> },
  { path: '/messages/templates', element: <Templates /> },
];
