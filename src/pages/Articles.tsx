import { useEffect, useState } from "react";

interface Person {
  id: number;
  name: string;
}

interface Magazine {
  id: number;
  title: string;
}

interface Article {
  id: number;
  title: string;
  authors: Person[];
  magazine: Magazine;
}

const API_URL = import.meta.env.VITE_API_URL;

function Articles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [magazines, setMagazines] = useState<Magazine[]>([]);

  const [title, setTitle] = useState("");
  const [selectedAuthors, setSelectedAuthors] = useState<number[]>([]);
  const [magazineId, setMagazineId] = useState("");

  const load = async () => {
    const a = await fetch(`${API_URL}/articles`);
    const p = await fetch(`${API_URL}/persons`);
    const m = await fetch(`${API_URL}/magazines`);

    setArticles(await a.json());
    setPersons(await p.json());
    setMagazines(await m.json());
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAuthor = (id: number) => {
    setSelectedAuthors((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const create = async () => {
    if (!title || !magazineId || selectedAuthors.length === 0) return;

    await fetch(`${API_URL}/articles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        authorIds: selectedAuthors,
        magazineId,
      }),
    });

    setTitle("");
    setSelectedAuthors([]);
    setMagazineId("");
    load();
  };

  return (
    <div>
      <h2 style={{ color: "white" }}>Artículos</h2>

      <input
        placeholder="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <h4 style={{ color: "white" }}>Autores</h4>
      {persons.map((p) => (
        <label key={p.id} style={{ display: "block", color: "white" }}>
          <input
            type="checkbox"
            checked={selectedAuthors.includes(p.id)}
            onChange={() => toggleAuthor(p.id)}
          />
          {p.name}
        </label>
      ))}

      <select value={magazineId} onChange={(e) => setMagazineId(e.target.value)}>
        <option value="">Revista</option>
        {magazines.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>

      <button onClick={create}>Crear</button>

      <hr />

      {articles.map((a) => (
        <div key={a.id} style={{ color: "white" }}>
          <strong>{a.title}</strong>
          <br />
          Autores: {a.authors.map((x) => x.name).join(", ")}
          <br />
          Revista: {a.magazine?.title}
        </div>
      ))}
    </div>
  );
}

export default Articles;