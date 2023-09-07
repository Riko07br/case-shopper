import { ChangeEvent, useState } from "react";
import axios from "axios";
import Products from "./Products";
//import "./App.css";

function App() {
    const [selectedFile, setSelectedFile] = useState<File>();
    const [validProducts, setValidProducts] = useState<boolean>(false);
    const [products, setProducts] = useState([]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleValidationClick = () => {
        if (!selectedFile) {
            return;
        }

        axios
            .postForm(import.meta.env.VITE_API_URL + "upload", {
                csv_file: selectedFile,
            })
            .then((response) => {
                setProducts(response.data);
                setValidProducts(true);
            })
            .catch((error) => {
                setProducts(error.response.data);
                setValidProducts(false);
            });
    };

    const handleUpdateClick = () => {
        axios
            .post(import.meta.env.VITE_API_URL + "update", products)
            .then((response) => {
                console.log(response);
                setProducts([]);
                setValidProducts(false);
            })
            .catch((error) => {
                console.error(error.response.data);
                setValidProducts(false);
            });
    };

    return (
        <>
            <div>
                <input type="file" onChange={handleFileChange} />

                <div>
                    <button
                        onClick={handleValidationClick}
                        disabled={!selectedFile}>
                        Validar
                    </button>
                    <button
                        onClick={handleUpdateClick}
                        disabled={!(products?.length > 0) || !validProducts}>
                        Atualizar
                    </button>
                </div>
            </div>
            <div>
                <table>
                    <tr>
                        <td>ID do produto</td>
                        <td>Nome</td>
                        <td>Preço atual</td>
                        <td>Novo Preço</td>
                        <td>Erros</td>
                    </tr>
                    {products?.length > 0 ? (
                        products.map((p) => <Products product={p} />)
                    ) : (
                        <tr>
                            <td>---</td>
                            <td>---</td>
                            <td>---</td>
                            <td>---</td>
                            <td>---</td>
                        </tr>
                    )}
                </table>
            </div>
        </>
    );
}

export default App;
