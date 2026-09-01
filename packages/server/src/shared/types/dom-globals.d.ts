// @investpro/server
// Declarações globais de compatibilidade.
// @types/node (undici) declara fetch/Response/RequestInit, mas não o tipo
// `RequestCredentials`, usado por @investpro/shared/src/client/apiClient.ts.
// Definido aqui para o tsc do server conseguir compilar o barrel do shared.

type RequestCredentials = 'omit' | 'same-origin' | 'include'