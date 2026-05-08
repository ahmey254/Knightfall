// Shared event names — keeps client/server in sync.
export const SocketEvents = {
  ConnectUser: 'connect_user',
  CreateGame: 'create_game',
  JoinRoom: 'join_room',
  FindMatch: 'find_match',
  CancelMatch: 'cancel_match',
  MakeMove: 'make_move',
  Resign: 'resign',
  OfferDraw: 'offer_draw',
  AcceptDraw: 'accept_draw',
  DeclineDraw: 'decline_draw',
  Chat: 'chat',
  Emoji: 'emoji',

  // Server → client
  GameStarted: 'game_started',
  PlayerJoined: 'player_joined',
  MoveMade: 'move_made',
  ClockTick: 'clock_tick',
  GameEnded: 'game_ended',
  ChatMessage: 'chat_message',
  DrawOffered: 'draw_offered',
  DrawDeclined: 'draw_declined',
  MatchFound: 'match_found',
  Presence: 'presence',
} as const;
