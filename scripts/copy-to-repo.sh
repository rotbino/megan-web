#!/bin/bash
set -e
SRC=/home/z/my-project
DST=/home/z/my-project/repos/megan-web

# پاک‌سازی مقصد (به‌جز .git)
find $DST -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +

# کپی فایل‌های پروژه (بدون موارد مخصوص سندباکس)
rsync -a --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dev.log' \
  --exclude='server.log' \
  --exclude='repos' \
  --exclude='skills' \
  --exclude='examples' \
  --exclude='mini-services' \
  --exclude='upload' \
  --exclude='db' \
  --exclude='download' \
  --exclude='scripts' \
  --exclude='.zscripts' \
  --exclude='worklog.md' \
  --exclude='bun.lock' \
  --exclude='db/' \
  $SRC/ $DST/

# حذف پوشه prisma از فرانت (دیتابیس در بک‌اند megan-back است)
rm -rf $DST/prisma
echo "copied:"
ls $DST
