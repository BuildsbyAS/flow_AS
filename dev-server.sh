#!/usr/bin/env bash
# Persistent Flow dev server manager.
# Runs `npm run dev` detached (nohup + subshell double-fork) so it survives
# the parent shell / agent turn ending. Manage with: start | stop | restart | status | logs
set -uo pipefail

DIR="/Users/ashastri/conductor/workspaces/flow/yokohama"
LOG="$DIR/.context/dev-server.log"
PIDFILE="$DIR/.context/dev-server.pid"
PORT=5173

cd "$DIR" || exit 1
mkdir -p "$DIR/.context"

port_pid() { lsof -nP -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null | head -1; }

start() {
  local existing; existing="$(port_pid)"
  if [ -n "$existing" ]; then
    echo "Already running on http://localhost:$PORT (PID $existing)"
    return 0
  fi
  # Detach: subshell exits immediately, reparenting npm/vite to launchd.
  ( nohup npm run dev -- --port "$PORT" --strictPort > "$LOG" 2>&1 < /dev/null & )
  # Wait up to ~20s for the port to start listening.
  local pid=""
  for _ in $(seq 1 40); do
    pid="$(port_pid)"; [ -n "$pid" ] && break; sleep 0.5
  done
  if [ -n "$pid" ]; then
    echo "$pid" > "$PIDFILE"
    echo "Started on http://localhost:$PORT (PID $pid)"
    echo "Logs: $LOG"
  else
    echo "Failed to start — last log lines:"; tail -20 "$LOG"; return 1
  fi
}

stop() {
  local pid; pid="$(port_pid)"
  if [ -n "$pid" ]; then
    # Kill the listener and its process group (npm + vite children).
    kill "$pid" 2>/dev/null
    pkill -P "$pid" 2>/dev/null
    echo "Stopped http://localhost:$PORT (was PID $pid)"
  else
    echo "Not running on :$PORT"
  fi
  rm -f "$PIDFILE"
}

status() {
  local pid; pid="$(port_pid)"
  if [ -n "$pid" ]; then
    echo "RUNNING — http://localhost:$PORT (PID $pid)"
  else
    echo "STOPPED"
  fi
}

case "${1:-start}" in
  start)   start ;;
  stop)    stop ;;
  restart) stop; sleep 1; start ;;
  status)  status ;;
  logs)    tail -f "$LOG" ;;
  *) echo "usage: $0 {start|stop|restart|status|logs}"; exit 1 ;;
esac
