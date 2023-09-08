import React from "react";

const Products = ({ product: { code, name, oldPrice, newPrice, err } }) => {
    const parsedNewPrice: string = (newPrice as number).toFixed(2);
    const parsedOldPrice: string = (oldPrice as number).toFixed(2);
    return (
        <tr className={err ? "productError" : ""}>
            <td>{code}</td>
            <td>{name}</td>
            <td>R$ {parsedOldPrice}</td>
            <td>R$ {parsedNewPrice}</td>
            <td>{err ? err : "Nenhum"}</td>
        </tr>
    );
};

export default Products;
