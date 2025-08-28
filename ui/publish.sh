#!/bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

echo "Publishing to docs github pages."

branch=$(git rev-parse --abbrev-ref HEAD)

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Workspace dirty. Commit or stash changes first."
  exit 1
fi

git status

read -p "Press enter to continue"

cd $SCRIPT_DIR

npm run build

mv build ../docs

git checkout -b publish-branch

git add ../docs

git commit -m "Publish $(date)"

git push -u origin publish-branch --force

git checkout $branch

echo "Published to GitHub Pages"