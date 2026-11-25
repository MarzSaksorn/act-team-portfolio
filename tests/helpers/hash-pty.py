import os
import pty
import select
import signal
import sys
import time

pid, fd = pty.fork()
if pid == 0:
    os.execvp('node', ['node', sys.argv[1]])
output = b''
sent = False
completed = False
try:
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        ready, _, _ = select.select([fd], [], [], 0.1)
        if ready:
            try:
                chunk = os.read(fd, 4096)
            except OSError:
                break
            if not chunk:
                break
            output += chunk
            if b'Password:' in output and not sent:
                os.write(fd, b'hidden-test-password-123\r')
                sent = True
        done, status = os.waitpid(pid, os.WNOHANG)
        if done:
            completed = True
            if os.waitstatus_to_exitcode(status) != 0:
                raise RuntimeError('Hash CLI failed: ' + output.decode())
            break
    if not completed:
        done, status = os.waitpid(pid, os.WNOHANG)
        if done:
            completed = True
            if os.waitstatus_to_exitcode(status) != 0:
                raise RuntimeError('Hash CLI failed: ' + output.decode())
    if not sent:
        raise RuntimeError('Password prompt missing: ' + output.decode())
    print(output.decode())
finally:
    if not completed:
        try:
            os.kill(pid, signal.SIGKILL)
            os.waitpid(pid, 0)
        except ProcessLookupError:
            pass
    os.close(fd)
