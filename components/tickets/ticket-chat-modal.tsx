"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { Ticket, TicketUser } from "./tickets-client"

// Tipos
interface CommentMetadata {
  system: {
    client: string
    ip_address: string
    location: string
    latitude: number
    longitude: number
  }
  custom: Record<string, unknown>
}

interface CommentVia {
  channel: string
  source: {
    from: Record<string, unknown>
    to: {
      name: string
      address: string
    }
    rel: string | null
  }
}

interface Comment {
  id: number
  type: string
  author_id: number
  body: string
  html_body: string
  plain_body: string
  public: boolean
  attachments: []
  audit_id: number
  via: CommentVia
  created_at: string
  metadata: CommentMetadata
  isLocalMessage?: boolean
  clientId?: string
}

interface CommentsResponse {
  comments: Comment[]
  next_page: string | null
  previous_page: string | null
  count: number
}

interface TicketInfo {
  id: number;
  subject: string;
  description: string;
  status: string;
  requester_id: number;
  assignee_id?: number;
  created_at?: string;
  updated_at?: string;
  user?: {
    name: string;
    email: string;
  };
  group_id?: number;
  internal_assignee?: {
    id: string;
    name: string;
    email: string;
  };
}

interface TicketChatModalProps {
  isOpen: boolean
  onClose: () => void
  user: TicketUser
  ticketId: number
  agentId: string;
  onTicketUpdated: (updatedTicket: Ticket) => void;
}

// Constantes
const POLLING_INTERVAL = 15000; // 15 segundos

// Hooks personalizados
function useTicketInfo(ticketId: number) {
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTicketInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${baseUrl}/zendesk/tickets/${ticketId}`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTicketInfo(data);
      return data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Error desconocido');
      setError(err);
      console.error('Error fetching ticket info:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicketInfo();
  }, [fetchTicketInfo]);

  return { ticketInfo, isLoading, error, fetchTicketInfo };
}

function useComments(ticketId: number, fetchTicketInfo: () => Promise<TicketInfo | null>) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const commentsRef = useRef<Comment[]>([]);

  // Actualizamos la referencia cuando cambian los comentarios
  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  const fetchComments = useCallback(async () => {
    try {
      // No establecer isLoading a true si ya hay comentarios para evitar parpadeos
      if (commentsRef.current.length === 0) {
        setIsLoading(true);
      }
      setError(null);

      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${baseUrl}/zendesk/tickets/${ticketId}/comments`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data: CommentsResponse = await response.json();

      // Obtener el ticket para conocer el requester_id
      await fetchTicketInfo();

      // Convertir comentarios del servidor y añadir clientId
      const serverComments = data.comments.map(comment => ({
        ...comment,
        isLocalMessage: false,
        clientId: comment.id.toString() // Añadir un clientId para facilitar la comparación
      }));

      // Crear un mapa de IDs de servidor para búsqueda rápida
      const serverCommentIds = new Set(serverComments.map(c => c.id));

      // Crear un mapa de textos de mensajes del servidor para búsqueda rápida
      const serverCommentTexts = new Map();
      serverComments.forEach(comment => {
        serverCommentTexts.set(comment.plain_body.trim(), comment);
      });

      // Actualizar los comentarios preservando los mensajes temporales que aún no están en el servidor
      setComments(prevComments => {
        // Filtrar los mensajes temporales que aún no están en el servidor
        const pendingLocalMessages = prevComments.filter(comment => {
          // Si es un mensaje local/temporal
          if (comment.isLocalMessage) {
            // Verificar si ya existe en el servidor por ID
            if (serverCommentIds.has(comment.id)) {
              return false;
            }

            // Verificar si ya existe en el servidor por contenido
            const serverMatch = serverCommentTexts.get(comment.plain_body.trim());
            if (serverMatch) {
              // Si encontramos una coincidencia por contenido, no mantener el mensaje local
              return false;
            }

            // Mantener el mensaje local si no está en el servidor
            return true;
          }
          return false;
        });

        // Combinar los comentarios del servidor con los mensajes temporales pendientes
        return [...serverComments, ...pendingLocalMessages];
      });

    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('Error al cargar los mensajes. Por favor, intenta de nuevo.');
      toast.error('Error al cargar los mensajes');
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, fetchTicketInfo]);

  return {
    comments,
    setComments,
    isLoading,
    error,
    fetchComments
  };
}

function useMessageSending(
  ticketId: number,
  agentId: string,
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>,
  fetchComments: () => Promise<void>
) {
  const { data: session } = useSession();
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isSending) return;

    // Generar un ID único para este mensaje
    const clientId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Crear el mensaje temporal
    const tempMessage: Comment = {
      id: Date.now(),
      type: "Comment",
      author_id: parseInt(agentId),
      body: messageText,
      html_body: messageText,
      plain_body: messageText,
      public: true,
      attachments: [],
      audit_id: Date.now(),
      via: { channel: "api", source: { from: {}, to: { name: "API", address: "" }, rel: null } },
      created_at: new Date().toISOString(),
      metadata: { system: { client: "", ip_address: "", location: "", latitude: 0, longitude: 0 }, custom: {} },
      isLocalMessage: true,
      clientId: clientId
    };

    // Añadir mensaje temporal a la interfaz inmediatamente
    setComments(prevComments => [...prevComments, tempMessage]);

    try {
      setIsSending(true);
      setError(null);
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      const currentUserId = session?.user?.id;

      // Enviar a la API
      const response = await fetch(`${baseUrl}/zendesk/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: messageText,
          authorId: agentId,
          currentUserId: currentUserId || 'unknown'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      // Actualizar el mensaje temporal con la información del servidor
      if (responseData && responseData.id) {
        // Actualizar el mensaje temporal con los datos del servidor
        setComments(prevComments => {
          return prevComments.map(comment => {
            if (comment.clientId === clientId) {
              // Actualizar el mensaje temporal con los datos del servidor
              return {
                ...comment,
                id: responseData.id,
                isLocalMessage: false, // Ya no es un mensaje temporal
                created_at: responseData.created_at || comment.created_at
              };
            }
            return comment;
          });
        });

        // Mostrar notificación de éxito
        toast.success('Mensaje enviado correctamente');

        // No hacemos fetchComments inmediatamente para evitar que el mensaje desaparezca
        // Solo actualizamos después de un tiempo para sincronizar con el servidor
        setTimeout(() => {
          fetchComments();
        }, 3000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Error al enviar el mensaje. Por favor, intenta de nuevo.');
      toast.error('Error al enviar el mensaje');

      // Eliminar el mensaje temporal en caso de error
      setComments(prevComments =>
        prevComments.filter(comment => comment.clientId !== clientId)
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const messageText = newMessage.trim();
    // Limpiar el campo de entrada inmediatamente para mejor UX
    setNewMessage("");

    // Eliminar el enfoque para quitar el reacuadro blanco
    blurActiveElement();

    await sendMessage(messageText);
  };

  return {
    isSending,
    newMessage,
    setNewMessage,
    error,
    handleSendMessage
  };
}

// Utilidades
const blurActiveElement = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

const formatDate = (dateString: string) => {
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
  } catch (error) {
    return 'Fecha inválida' + error;
  }
};

// Componentes
const MessageBubble = ({
  comment,
  isFromClient,
  userName
}: {
  comment: Comment,
  isFromClient: boolean,
  userName: string
}) => {
  const isTemporary = comment.isLocalMessage;

  return (
    <div
      className={`flex ${isFromClient ? "justify-start" : "justify-end"} transition-all duration-300 ease-in-out focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-none`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${isFromClient
          ? "bg-muted"
          : "bg-primary text-primary-foreground ml-auto"
          } ${isTemporary
            ? "opacity-80 transition-all duration-300"
            : "opacity-100 transition-all duration-300"
          } focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-none`}
      >
        <div className="flex justify-between items-start mb-1 focus:outline-none focus-visible:outline-none">
          <span className="text-xs font-semibold focus:outline-none focus-visible:outline-none">
            {isFromClient ? userName : "Agente"}
          </span>
          {isTemporary && (
            <span className="text-xs ml-2 bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full animate-pulse flex items-center focus:outline-none focus-visible:outline-none">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1 focus:outline-none focus-visible:outline-none"></span>
              enviando...
            </span>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap focus:outline-none focus-visible:outline-none">{comment.plain_body}</p>
        <span className="text-xs opacity-70 mt-1 block focus:outline-none focus-visible:outline-none">
          {isTemporary ? "Ahora" : formatDate(comment.created_at)}
        </span>
      </div>
    </div>
  );
};

const MessageList = ({
  comments,
  isLoading,
  error,
  isClientComment,
  userName,
  messagesEndRef
}: {
  comments: Comment[],
  isLoading: boolean,
  error: string | null,
  isClientComment: (comment: Comment) => boolean,
  userName: string,
  messagesEndRef: { current: HTMLDivElement | null }
}) => {
  if (isLoading && comments.length === 0) {
    return (
      <div className="flex justify-center items-center h-full focus:outline-none focus-visible:outline-none">
        <span className="text-muted-foreground focus:outline-none focus-visible:outline-none">Cargando mensajes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full text-destructive focus:outline-none focus-visible:outline-none">
        <span className="focus:outline-none focus-visible:outline-none">{error}</span>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="flex justify-center items-center h-full focus:outline-none focus-visible:outline-none">
        <span className="text-muted-foreground focus:outline-none focus-visible:outline-none">No hay mensajes aún</span>
      </div>
    );
  }

  return (
    <>
      {comments.map((comment) => (
        <MessageBubble
          key={comment.clientId || comment.id}
          comment={comment}
          isFromClient={isClientComment(comment)}
          userName={userName}
        />
      ))}
      <div ref={messagesEndRef} className="focus:outline-none focus-visible:outline-none" />
    </>
  );
};

const MessageInput = ({
  newMessage,
  setNewMessage,
  handleSendMessage,
  isLoading,
  isSending
}: {
  newMessage: string,
  setNewMessage: (value: string) => void,
  handleSendMessage: () => void,
  isLoading: boolean,
  isSending: boolean
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      blurActiveElement();
    }
  };

  return (
    <div className="border-t pt-4 focus:outline-none focus-visible:outline-none">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
          blurActiveElement();
        }}
        className="flex gap-2 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-none"
      >
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Escribe un mensaje..."
          className="flex-1 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none focus-visible:border-input"
          disabled={isLoading || isSending}
          autoComplete="off"
        />
        <Button
          type="submit"

          disabled={isLoading || isSending || !newMessage.trim()}
          className="focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none focus-visible:border-none"
          onClick={() => {
            setTimeout(() => blurActiveElement(), 10);
          }}
        >
          <Send className="h-4 w-4 focus:outline-none focus-visible:outline-none" />
        </Button>
      </form>
    </div>
  );
};

// Componente principal
// Componente principal
export function TicketChatModal({ isOpen, onClose, user, ticketId, agentId, onTicketUpdated }: TicketChatModalProps) {
  const { data: session } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAssignedToCurrentUser, setIsAssignedToCurrentUser] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Hooks personalizados
  const { ticketInfo, isLoading, fetchTicketInfo } = useTicketInfo(ticketId);
  const { comments, setComments, isLoading: isLoadingComments, error: commentsError, fetchComments } = useComments(ticketId, fetchTicketInfo);
  const { isSending, newMessage, setNewMessage, error: sendError, handleSendMessage } = useMessageSending(ticketId, agentId, setComments, fetchComments);

  // Verificar si el ticket está asignado al usuario actual
  useEffect(() => {
    if (ticketInfo && session?.user?.id) {
      // Verificar si el usuario actual es el asignado internamente
      const currentUserId = session.user.id.toString();
      setIsAssignedToCurrentUser(
        ticketInfo.internal_assignee?.id === currentUserId
      );
    }
  }, [ticketInfo, session]);

  // Función para asignarse el ticket
  const handleAssignToMe = async () => {
    if (!session?.user?.id) return;

    try {
      setIsAssigning(true);
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      // Llamar al endpoint para reasignar el ticket
      const response = await fetch(`${baseUrl}/zendesk/reassign-ticket/${ticketId}/to-operator/${session.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        throw new Error(`Error al asignar ticket: ${errorData}`);
      }

      const updatedTicket = await response.json();

      // Recargar la información del ticket para el modal
      await fetchTicketInfo();
      setIsAssignedToCurrentUser(true);

      // Actualizar la tabla de tickets a través de la prop onTicketUpdated
      if (onTicketUpdated && updatedTicket) {
        // Asegurarnos de que el ticket tiene toda la información necesaria
        const completeTicket = {
          ...updatedTicket,
          internal_assignee: updatedTicket.internal_assignee || {
            id: parseInt(session.user.id),
            name: session.user.name || '',
            email: session.user.email || ''
          }
        };
        onTicketUpdated(completeTicket);
      }

      toast.success('Ticket asignado correctamente');
    } catch (error) {
      console.error('Error al asignar ticket:', error);
      toast.error(error instanceof Error ? error.message : 'Error al asignar el ticket');
    } finally {
      setIsAssigning(false);
    }
  };

  // Efecto para polling de comentarios
  useEffect(() => {
    let isActive = true;
    let pollingInterval: NodeJS.Timeout | null = null;

    const initPolling = async () => {
      if (isOpen && ticketId && isActive) {
        await fetchComments();

        if (isActive) {
          pollingInterval = setInterval(async () => {
            if (isActive && !isSending) {
              await fetchComments();
            }
          }, POLLING_INTERVAL);
        }
      }
    };

    initPolling();

    return () => {
      isActive = false;
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isOpen, ticketId, fetchComments, isSending]);

  // Efecto para scroll al fondo cuando cambian los comentarios
  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Determinar si un comentario fue escrito por el cliente (requester)
  const isClientComment = (comment: Comment) => {
    // Si tenemos la información del ticket, podemos comparar con el requester_id
    if (ticketInfo?.requester_id) {
      return comment.author_id === ticketInfo.requester_id;
    }

    // Si es un mensaje local/temporal que creamos como agente
    if (comment.isLocalMessage || comment.clientId?.startsWith('local_')) {
      return false;
    }

    // Si coincide con el ID del agente actual, definitivamente NO es del cliente
    if (comment.author_id === parseInt(agentId)) {
      return false;
    }

    // Si el comentario tiene un via_channel específico que indica que es del sistema o agente
    if (comment.via?.channel === "api" || comment.via?.channel === "admin") {
      return false;
    }

    // El primer comentario generalmente es la descripción del ticket (del cliente)
    const isFirstComment = comments.length > 0 && comments[0].id === comment.id;
    if (isFirstComment) {
      return true;
    }

    // Si viene del canal web o email, probablemente es del cliente
    if (comment.via?.channel === "web" || comment.via?.channel === "email") {
      return true;
    }

    // En caso de duda, asumimos que es del cliente si no podemos confirmar que es del agente
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:ring-0 focus:ring-offset-0 focus-visible:border-none">
        <DialogHeader className="border-b pb-4 focus:outline-none focus-visible:outline-none">
          <div>
            <DialogTitle className="text-lg font-semibold focus:outline-none focus-visible:outline-none">
              Chat con {user?.name || 'Usuario'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground focus:outline-none focus-visible:outline-none">
              {user?.email || 'Sin email'} - Ticket #{ticketId}
              {ticketInfo?.internal_assignee && (
                <span className="ml-2">
                  (Asignado a: {ticketInfo.internal_assignee.name})
                </span>
              )}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-none">
          <MessageList
            comments={comments}
            isLoading={isLoadingComments}
            error={commentsError || sendError}
            isClientComment={isClientComment}
            userName={user?.name || 'Usuario'}
            messagesEndRef={messagesEndRef}
          />
        </div>

        {/* Message Input */}
        <div className="border-t pt-4">
          {isLoading ? (
            <div className="p-3">
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            </div>
          ) : ticketInfo?.internal_assignee ? (
            // Ticket is assigned
            isAssignedToCurrentUser ? (
              // Assigned to current user - show message input
              <MessageInput
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessage}
                isLoading={isLoadingComments}
                isSending={isSending}
              />
            ) : (
              // Assigned to someone else - show warning message
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="text-sm text-muted-foreground text-center">
                  No puedes enviar mensajes en este ticket ya que está asignado a {ticketInfo.internal_assignee.name}
                </p>
              </div>
            )
          ) : (
            // Ticket not assigned - show assign button
            <div className="p-3 bg-muted/30">
              <Button
                onClick={handleAssignToMe}
                disabled={isAssigning}
                className="w-full"
              >
                {isAssigning ? 'Asignando ticket...' : 'Asignarme este ticket para responder'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}