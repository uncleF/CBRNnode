# [CBRNnode](https://github.com/uncleF/CBRNnode)

Handy opinionated tool for renaming comic book pages according to the predetermend pattern:

```
DIRECTORY_NAME - PAGE(N)[ - PAGE(N+1)].jpg
```

## Prerequisites

### [Node.js](https://nodejs.org)

[Node.js](https://nodejs.org) version at or above 0.10.x

## Instructions

Renaming books in the current directory. Each subdirectory at a root level counts as one separate book.

```sh
$ cbrn
```

Renaming books at the provided destination. Each subdirectory at a root level of the provided destination counts as one separate book.

```sh
$ cbrn -d PATH
```

Renaming books in the current directory and archiving them into separate archive.

```sh
$ cbrn --zip
```
