// Fundo de aurora animada (blobs coloridos) + grão sutil.
export function Aurora() {
  return (
    <>
      <div className="aurora" aria-hidden="true">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="blob b4" />
      </div>
      <div className="grain" aria-hidden="true" />
    </>
  );
}
