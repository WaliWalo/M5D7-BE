const express = require("express");

const {
  getBooks,
  writeBooks,
  getComments,
  writeComments,
} = require("../../fsUtilities");

const uniqid = require("uniqid");

const booksRouter = express.Router();

booksRouter.get("/", async (req, res, next) => {
  try {
    const books = await getBooks();

    if (req.query && req.query.category) {
      const filteredBooks = books.filter(
        (book) =>
          book.hasOwnProperty("category") &&
          book.category === req.query.category
      );
      res.send(filteredBooks);
    } else {
      res.send(books);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

booksRouter.get("/:asin", async (req, res, next) => {
  try {
    const books = await getBooks();

    const bookFound = books.find((book) => book.asin === req.params.asin);

    if (bookFound) {
      res.send(bookFound);
    } else {
      const err = new Error();
      err.httpStatusCode = 404;
      next(err);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

booksRouter.post("/", async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error();
      error.message = errors;
      error.httpStatusCode = 400;
      next(error);
    } else {
      const books = await getBooks();

      const asinFound = books.find((book) => book.asin === req.body.asin);

      if (asinFound) {
        const error = new Error();
        error.httpStatusCode = 400;
        error.message = "Book already in db";
        next(error);
      } else {
        books.push(req.body);
        await writeBooks(books);
        res.status(201).send({ asin: req.body.asin });
      }
    }
  } catch (error) {
    console.log(error);
    const err = new Error("An error occurred while reading from the file");
    next(err);
  }
});

booksRouter.put("/:asin", async (req, res, next) => {
  try {
    const validatedData = matchedData(req);
    const books = await getBooks();

    const bookIndex = books.findIndex((book) => book.asin === req.params.asin);

    if (bookIndex !== -1) {
      // book found
      const updatedBooks = [
        ...books.slice(0, bookIndex),
        { ...books[bookIndex], ...validatedData },
        ...books.slice(bookIndex + 1),
      ];
      await writeBooks(updatedBooks);
      res.send(updatedBooks);
    } else {
      const err = new Error();
      err.httpStatusCode = 404;
      next(err);
    }
  } catch (error) {
    console.log(error);
    const err = new Error("An error occurred while reading from the file");
    next(err);
  }
});

booksRouter.delete("/:asin", async (req, res, next) => {
  try {
    const books = await getBooks();

    const bookFound = books.find((book) => book.asin === req.params.asin);

    if (bookFound) {
      const filteredBooks = books.filter(
        (book) => book.asin !== req.params.asin
      );

      await writeBooks(filteredBooks);
      res.status(204).send();
    } else {
      const error = new Error();
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

//POST COMMENTS
booksRouter.post("/:bookId/comments/", async (req, res, next) => {
  try {
    let commentsDB = await getComments();
    let booksDB = await getBooks();

    let selectedBook = booksDB.find((book) => book.asin === req.params.bookId);
    let newBooksDB = booksDB.filter((book) => book.asin !== req.params.bookId);

    let comment = req.body;
    comment.id = uniqid();
    comment.date = new Date();

    if (selectedBook.comments) {
      selectedBook.comments.push(comment.id);
    } else {
      selectedBook.comments = [comment.id];
    }

    newBooksDB.push(selectedBook);
    commentsDB.push(comment);
    await writeBooks(newBooksDB);
    await writeComments(commentsDB);

    res.status(200).send(selectedBook);
  } catch (error) {
    console.log(error);
    next(error);
  }
});
//GET COMMENTS
booksRouter.get("/:bookId/comments/", async (req, res, next) => {
  try {
    const booksDB = await getBooks();
    const commentsDB = await getComments();

    const selectedBook = booksDB.find(
      (book) => book.asin === req.params.bookId
    );
    if (selectedBook.comments) {
      const newComments = [];
      selectedBook.comments.forEach((bookComment) => {
        newComments.push(
          commentsDB.find((comment) => comment.id === bookComment)
        );
      });
      res.status(200).send(newComments);
    } else {
      const error = new Error();
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});
//DELETE COMMENTS
booksRouter.delete("/:bookId/comments/:commentId", async (req, res, next) => {
  try {
    //modifying books.json
    const booksDB = await getBooks();

    const selectedBook = booksDB.find(
      (book) => book.asin === req.params.bookId
    );

    if (selectedBook && selectedBook.comments) {
      selectedBook.comments = selectedBook.comments.filter(
        (comment) => comment !== req.params.commentId
      );
      const newBooksDB = booksDB.filter(
        (book) => book.asin !== req.params.bookId
      );
      newBooksDB.push(selectedBook);

      writeBooks(newBooksDB);

      //modifying comments.json
      const commentsDB = await getComments();
      const newCommentDB = commentsDB.filter(
        (comment) => comment.id !== req.params.commentId
      );
      writeComments(newCommentDB);
      res.status(200).send(selectedBook);
    } else {
      const error = new Error();
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});
module.exports = booksRouter;
